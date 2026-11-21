FROM node:26.13.0@sha256:438603bbb5cda404b9416f0b5c8026f61501ab911760d861ec28c36b5d675725 AS build

COPY frontend/package.json frontend/build-scripts/extract-versions.js frontend/package-lock.json /app/frontend/
COPY backend/package.json backend/package-lock.json /app/backend/
COPY package.json package-lock.json /app/

WORKDIR /app
RUN npm ci

COPY . ./

RUN npm run build

FROM node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

ENV USER_UID=1001
ENV GROUP_UID=1001

COPY --from=build --chown=${USER_UID}:${GROUP_UID} /app/backend /app/backend
COPY --from=build --chown=${USER_UID}:${GROUP_UID} /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend
EXPOSE 3000
USER ${USER_UID}:${GROUP_UID}
CMD ["node", "dist/main"]
