const SKIP_LIST = [".DS_Store", ".stfolder", ".stfolder/", ".jpg.gz"];

const BASE_URL = "https://photo-blog.oskarlindgren.se";

function getParts(row: string) {
  const parts = row.split("|");
  const url = parts[0].trim();
  const name = parts[1].trim();
  const isDir = parts[2].trim() === "true";
  const date = parts[3].trim();

  return {
    url,
    name,
    isDir,
    date,
  };
}

async function listAlbums() {
  const albums: {
    name: string;
    creationDate: Date;
  }[] = [];

  const response = await fetch(`${BASE_URL}/`);
  const rawText = await response.text();
  const row = rawText.split("\n");
  row.forEach((x) => {
    if (!x) {
      return;
    }

    const { name, date } = getParts(x);
    if (SKIP_LIST.includes(name)) {
      return;
    }

    albums.push({
      name,
      creationDate: new Date(date),
    });
  });

  return albums.sort((a, b) => {
    return a.creationDate > b.creationDate ? -1 : 1;
  })
    .map((x) => x.name);
}

type Photo = {
  url: string;
  alt: string;
};

async function listPhotos(albumNameRaw: string) {
  const albumName = decodeURIComponent(albumNameRaw);

  const photos: Photo[] = [];

  const response = await fetch(`${BASE_URL}/${albumName}`);
  const hej = await response.text();

  const row = hej.split("\n");
  row.forEach((x, i) => {
    if (!x) {
      return;
    }

    const { name } = getParts(x);

    if (SKIP_LIST.includes(name)) {
      return;
    }

    photos.push({
      url: `${BASE_URL}/${encodeURIComponent(albumName)}/${
        encodeURIComponent(name)
      }`,
      alt: name,
    });
  });
  return photos;
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
