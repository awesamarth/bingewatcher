FROM oven/bun:1.3.14 AS bun
FROM node:22-bookworm-slim

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN node node_modules/next/dist/bin/next build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 10000

CMD ["node", "node_modules/next/dist/bin/next", "start"]
