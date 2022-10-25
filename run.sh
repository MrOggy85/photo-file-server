#!/bin/bash

deno run \
  --watch \
  --allow-net \
  --allow-read=files/ \
  --unstable \
  main.ts
