FROM node:24.20@sha256:be23f54a88d34e8824c741b19b91064094f92c1c97b194144bfc8b50d67258e2 AS build

COPY frontend/package.json frontend/build-scripts/extract-versions.js frontend/package-lock.json /app/frontend/
COPY backend/package.json backend/package-lock.json /app/backend/
COPY package.json package-lock.json /app/

WORKDIR /app
RUN npm ci

COPY . ./

RUN npm run build

FROM node:24.20.0-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf

ENV USER_UID=1001
ENV GROUP_UID=1001

COPY --from=build --chown=${USER_UID}:${GROUP_UID} /app/backend /app/backend
COPY --from=build --chown=${USER_UID}:${GROUP_UID} /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend
EXPOSE 3000
USER ${USER_UID}:${GROUP_UID}
CMD ["node", "dist/main"]
