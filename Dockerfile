FROM hayd/deno:ubuntu-1.9.2

EXPOSE 3000

WORKDIR /app

USER root

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in main.ts.
COPY deps.ts .
RUN deno cache deps.ts

# These steps will be re-run upon each file change in your working directory:
ADD deps.ts .
ADD main.ts .
ADD start.sh .
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache main.ts

CMD ["bash", "./start.sh"]
