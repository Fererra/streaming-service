FROM node:lts-alpine@sha256:c921b97d4b74f51744057454b306b418cf693865e73b8100559189605f6955b8 AS base
WORKDIR /usr/src/app
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npm run build:api

FROM deps AS development
CMD ["npm", "run", "start:dev:api"]

FROM deps AS test
CMD ["npm", "run", "test"]

FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS production
COPY --chown=node:node --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
USER node
CMD ["node", "dist/api/main.js"]