import { serve } from "./deps.ts";

const SKIP_LIST = [".DS_Store", ".stfolder"];

const server = serve({ port: 3000 });
console.log(`HTTP webserver running.  Access it at:  http://localhost:3000/`);

async function listAlbums() {
  const albums: {
    name: string;
    creationDate: Date;
  }[] = [];

  for await (const dirEntry of Deno.readDir("files")) {
    if (SKIP_LIST.includes(dirEntry.name)) {
      continue;
    }
    const birthtime = Deno.statSync(`files/${dirEntry.name}`).birthtime ||
      new Date();

    albums.push({
      name: dirEntry.name,
      creationDate: birthtime,
    });
  }

  return albums.sort((a, b) => {
    return a.creationDate > b.creationDate ? -1 : 1;
  })
    .map((x) => x.name);
}

async function listPhotos(albumNameRaw: string) {
  const albumName = decodeURIComponent(albumNameRaw);

  const photos: string[] = [];
  for await (const dirEntry of Deno.readDir(`files/${albumName}`)) {
    if (SKIP_LIST.includes(dirEntry.name)) {
      continue;
    }
    photos.push(dirEntry.name);
  }
  return photos;
}

async function getPhoto(albumNameRaw: string, photoNameRaw: string) {
  const albumName = decodeURIComponent(albumNameRaw);
  const photoName = photoNameRaw.replaceAll("%20", " ");
  const img = await Deno.readFile(`files/${albumName}/${photoName}`);
  return img;
}

for await (const request of server) {
  const headers = new Headers();
  try {
    console.log(`${request.method} ${request.url}`);

    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Request-Headers", "GET");

    const path = request.url.split("/");
    const mainRoute = path[1];

    switch (mainRoute.toLowerCase()) {
      case "list": {
        const albums = await listAlbums();
        request.respond({ headers, status: 200, body: JSON.stringify(albums) });
        continue;
      }

      case "album": {
        const name = path[2];
        if (!name) {
          request.respond({
            headers,
            status: 400,
            body: "no album name in path",
          });
          continue;
        }
        try {
          const photos = await listPhotos(name);
          request.respond({
            headers,
            status: 200,
            body: JSON.stringify(photos),
          });
        } catch (error) {
          console.log("error", error);
          request.respond({
            headers,
            status: 404,
            body: "no album with that name",
          });
        }
        continue;
      }

      case "photo": {
        const album = path[2];
        if (!album) {
          request.respond({
            headers,
            status: 400,
            body: "no album name in path",
          });
          continue;
        }
        const photo = path[3];
        if (!photo) {
          request.respond({
            headers,
            status: 400,
            body: "no photo name in path",
          });
          continue;
        }

        try {
          const img = await getPhoto(album, photo);

          const photoParts = photo.split(".");
          const imageType = photoParts[photoParts.length - 1];
          headers.set("content-type", `image/${imageType}`);
          headers.set("cache-control", "max-age=31536000");

          request.respond({ headers, body: img, status: 200 });
        } catch (error) {
          console.log("error", error);
          request.respond({ headers, status: 404, body: "photo not found" });
        }
        continue;
      }

      default:
        break;
    }

    let bodyContent = "Your user-agent is:\n\n";
    bodyContent += request.headers.get("user-agent") || "Unknown";

    request.respond({ status: 200, body: bodyContent });
  } catch (error) {
    request.respond({ headers, status: 500, body: error });
  }
}
