#!/bin/bash

deno run \
  --allow-net \
  --allow-read=files/ \
  --unstable \
  main.ts
