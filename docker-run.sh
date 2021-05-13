#!/bin/bash

docker run \
  -d \
  --rm \
  --name deno-file-server \
  -v $(pwd)/files:/app/files:ro \
  -p 3000:3000 \
  deno-file-server
