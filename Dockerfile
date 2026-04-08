FROM node:24.14@sha256:80fc934952c8f1b2b4d39907af7211f8a9fff1a4c2cf673fb49099292c251cec AS build

COPY frontend/package.json frontend/build-scripts/extract-versions.js frontend/package-lock.json /app/frontend/
COPY backend/package.json backend/package-lock.json /app/backend/
COPY package.json package-lock.json /app/

WORKDIR /app
RUN npm ci

COPY . ./

RUN npm run build

FROM node:24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b

ENV USER_UID=1001
ENV GROUP_UID=1001

COPY --from=build --chown=${USER_UID}:${GROUP_UID} /app/backend /app/backend
COPY --from=build --chown=${USER_UID}:${GROUP_UID} /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend
EXPOSE 3000
USER ${USER_UID}:${GROUP_UID}
CMD ["node", "dist/main"]
