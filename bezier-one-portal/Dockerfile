# Bézier ONE — image de production (Node 22 + ffmpeg + poppler pour les aperçus)
FROM node:22-alpine

RUN apk add --no-cache ffmpeg poppler-utils tini

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.mjs ./
COPY src ./src
COPY public ./public

ENV PORT=8080 \
    LIBRARY_ROOT=/library \
    DATA_DIR=/data/v2

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health > /dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.mjs"]
