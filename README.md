# Photo File Server

Simple Photo Filer Server powered by [Deno](https://deno.land/)

## Usage
Make sure you have a folder called `files` in the root of your project.

```sh
./start
```

## Endpoints
* `/list`
List all the folders inside the main folder called `files`

* `/album/:albumName`
List all the files inside the folder `:albumName` inside `files`

* `/photo/:albumName/:photoName`
Returns the image inside the folder `:albumName` inside `files` with the name `:photoName`.
The image will be compressed and resized on the fly leaving the image on disk untouched.

## Docker

### Build
You can build your own image using the `Dockerfile` or use the prebuilt image at [DockerHub](https://hub.docker.com/r/mroggy85/photo-file-server)
```sh
docker pull mroggy85/photo-file-server:latest
```

### Run
Make sure you mount the `files` folder and expose port `3000`
```sh
docker run \
  -d \
  --rm \
  --name deno-file-server \
  -v $(pwd)/files:/app/files:ro \
  -p 3000:3000 \
  deno-file-server
```
