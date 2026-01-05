FROM node:lts-alpine@sha256:c921b97d4b74f51744057454b306b418cf693865e73b8100559189605f6955b8 AS base
RUN apk add --no-cache dumb-init
WORKDIR /usr/src/app

FROM base AS build
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

FROM base AS development
COPY package*.json tsconfig*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY src ./src
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:dev"]

FROM base AS test
COPY package*.json tsconfig*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY src ./src
COPY test ./test
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "test"]

FROM base AS production
COPY --chown=node:node package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]