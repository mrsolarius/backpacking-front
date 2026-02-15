FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY scripts/runtime-env.mjs /app/scripts/runtime-env.mjs
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --from=build /app/dist/backpacking /app/dist/backpacking
RUN chmod +x /usr/local/bin/entrypoint.sh && chown -R node:node /app

USER node
EXPOSE 4001
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
