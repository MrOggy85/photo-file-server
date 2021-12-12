import { Image } from "./deps.ts";

const SKIP_LIST = [".DS_Store", ".stfolder"];

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

type Photo = {
  url: string;
  width: number;
  height: number;
  alt: string;
}

async function listPhotos(albumNameRaw: string) {
  const albumName = decodeURIComponent(albumNameRaw);

  const photos: Photo[] = [];
  for await (const dirEntry of Deno.readDir(`files/${albumName}`)) {
    if (SKIP_LIST.includes(dirEntry.name)) {
      continue;
    }

    const imageAsText = await getPhoto(albumName, dirEntry.name);
    const image = await Image.decode(imageAsText);

    photos.push({
      url: dirEntry.name,
      width: image.width,
      height: image.height,
      alt: dirEntry.name.split('.')[0] || '',
    });
  }
  return photos;
}



const photoCache: Record<string, Uint8Array> = {}

async function getPhoto(albumNameRaw: string, photoNameRaw: string) {
  const albumName = decodeURIComponent(albumNameRaw);
  const photoName = photoNameRaw.replaceAll("%20", " ");

  const cacheKey = `${albumName}-${photoName}`;
  const cache = photoCache[cacheKey]
  if (cache) {
    return cache;
  }

  const imageAsText = await Deno.readFile(`files/${albumName}/${photoName}`);

  const image = await Image.decode(imageAsText);

  const resizedImage = image.resize(image.width / 3, Image.RESIZE_AUTO);
  const encodedJpeg = await resizedImage.encodeJPEG(85);

  photoCache[cacheKey] = encodedJpeg;

  return encodedJpeg;
}

try {
  console.log(`HTTP webserver running. Access it at:  http://localhost:3001/`);
  for await (const conn of Deno.listen({ port: 3001 })) {
    (async () => {
      try {
        for await (const { request, respondWith } of Deno.serveHttp(conn)) {

          const headers = new Headers();
          console.log(
            `${request.method} ${request.url}`,
          );

          headers.set("Access-Control-Allow-Origin", "*");
          headers.set("Access-Control-Request-Headers", "GET");

          const path = request.url.split("//")[1].split("/");
          const mainRoute = path[1];

          switch (mainRoute.toLowerCase()) {
            case "list": {
              try {
                const albums = await listAlbums();
                await respondWith(
                  new Response(JSON.stringify(albums), {
                    headers,
                    status: 200,
                  }),
                );
              } catch (error) {
                console.log(error);
                await respondWith(
                  new Response(JSON.stringify(error.message), {
                    headers,
                    status: 500,
                  }),
                );
              }
              continue;
            }

            case "album": {
              const name = path[2];
              if (!name) {
                await respondWith(
                  new Response("no album name in path", {
                    headers,
                    status: 400,
                  }),
                );
                continue;
              }
              try {
                const photos = await listPhotos(name);
                await respondWith(
                  new Response(JSON.stringify(photos), {
                    headers,
                    status: 200,
                  }),
                );
              } catch (error) {
                console.log(error);
                await respondWith(
                  new Response("no album with that name", {
                    headers,
                    status: 404,
                  }),
                );
              }
              continue;
            }

            case "photo": {
              const album = path[2];
              if (!album) {
                await respondWith(
                  new Response("no album name in path", {
                    headers,
                    status: 400,
                  }),
                );
                continue;
              }
              const photo = path[3];
              if (!photo) {
                await respondWith(
                  new Response("no photo name in path", {
                    headers,
                    status: 400,
                  }),
                );
                continue;
              }

              try {
                const img = await getPhoto(album, photo);

                const photoParts = photo.split(".");
                const imageType = photoParts[photoParts.length - 1];
                headers.set("content-type", `image/${imageType}`);
                headers.set("cache-control", "max-age=31536000");

                await respondWith(
                  new Response(img, {
                    headers,
                    status: 200,
                  }),
                );
              } catch (error) {
                console.log("error", error);
                await respondWith(
                  new Response(error.message, {
                    headers,
                    status: 500,
                  }),
                );
              }
              continue;
            }

            default:
              break;
          }

          let bodyContent = "Your user-agent is:\n\n";
          bodyContent += request.headers.get("user-agent") || "Unknown";

          await respondWith(
            new Response(bodyContent, {
              headers,
              status: 200,
            }),
          );
        }
      } catch (error) {
        console.log("main Error", error);
      }
    })();
  }
} catch (error) {
  console.log("super Error", error);
}
