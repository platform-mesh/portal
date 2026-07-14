## Overview

# Contributing to Platform Mesh
We want to make contributing to this project as easy and transparent as possible.

## Our development process
We use GitHub to track issues and feature requests, as well as accept pull requests.

## Pull requests
You are welcome to contribute with your pull requests. These steps explain the contribution process:

1. Fork the repository and create your branch from `main`.
1. [Add tests](#testing) for your code.
1. If you've changed APIs, update the documentation. 
1. Make sure the tests pass. Our GitHub actions pipeline is running the unit and e2e tests for your PR and will indicate any issues.
1. Sign the Developer Certificate of Origin (DCO).


### Running the project locally

> **TL;DR:** bring up the platform-mesh [local-setup](https://github.com/platform-mesh/helm-charts/tree/main/local-setup) first, point `backend/.env` at it, then run `npm start` from the repository root and open <http://localhost:4300>.

#### The two things you run, and how they relate

The portal is a monorepo with two independently-built apps:

| Part | Framework | Local URL | Role |
| --- | --- | --- | --- |
| `frontend/` | Angular 21 (Luigi shell) | `http://localhost:4300` | The UI you develop. |
| `backend/` | NestJS | `http://localhost:3000` | Thin wrapper around `@platform-mesh/portal-server-lib`. Handles OIDC login, cookies, kcp/gateway access. |

`npm start` (root [`package.json`](package.json)) uses [`concurrently`](https://www.npmjs.com/package/concurrently) to start **both**:

- `start:ui` &rarr; `cd frontend && npm run start:watch` (serves on `:4300`, restarts on `.yalc` changes via [`frontend/nodemon.json`](frontend/nodemon.json)).
- `start:server` &rarr; `cd backend && npm run start:debug` (NestJS in `--debug --watch` mode on `:3000`).

The browser only ever talks to `http://localhost:4300`. The Angular dev server proxies every `"/rest/**"` call to the backend on `:3000` — see [`frontend/proxy.config.json`](frontend/proxy.config.json):

```json
{
  "/rest/**": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Everything else — the identity provider (Keycloak), kcp, the gateway/IAM GraphQL APIs — is **not** part of what you run here. It comes from the running local-setup (see below), which your local backend connects to.

Install dependencies before the first run (the root `prepare` script installs both, and runs automatically on `npm install`):

```bash
npm install                 # husky hooks + frontend + backend deps
# or individually:
npm run npm:install:ui
npm run npm:install:server
```

#### HTTPS locally and how it relates to the local-setup

You do **not** terminate TLS in the portal you run from this repo. The topology is:

```
browser ──http──▶ ng serve (frontend :4300)
                     │  proxies /rest/** ──http──▶ NestJS backend (:3000)
                     │
browser ──https──▶ local-setup gateway (https://portal.localhost:8443)  ◀── backend calls (OIDC, kcp, gateway, IAM)
```

- The **frontend and backend run on plain HTTP** (`localhost:4300` / `localhost:3000`). `localhost` is a browser [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts), so the `Secure`/`HttpOnly` auth cookie set by the server lib still works over `http://localhost` — no local certificate is needed for the portal itself.
- **HTTPS lives in the local-setup**, whose Gateway/ingress terminates TLS at **`https://portal.localhost:8443`** using [`mkcert`](https://github.com/FiloSottile/mkcert)-generated certificates. Modern browsers auto-resolve `*.localhost` to `127.0.0.1`, so no `/etc/hosts` entry is required for browser access.
- Because your **backend** makes outbound HTTPS calls to `https://portal.localhost:8443` (OIDC discovery, gateway, IAM), Node has to trust the local-setup CA. That is what `NODE_EXTRA_CA_CERTS` in `backend/.env` is for — it points at the CA that the local-setup generated. Without it, the backend's calls to the cluster fail with self-signed-certificate errors.

#### Bring up the local-setup first

The portal is developed **against** a running platform-mesh local-setup from the [`platform-mesh/helm-charts`](https://github.com/platform-mesh/helm-charts) repository (`local-setup/`). Start it before running the portal:

```bash
# in your checkout of platform-mesh/helm-charts
task local-setup            # full setup (creates a kind cluster)
# or without the Task CLI:
./local-setup/scripts/start.sh
```

When it finishes, the platform is reachable at **`https://portal.localhost:8443`** (kcp API at `https://localhost:8443`), Keycloak is deployed as the identity provider, and the mkcert CA plus kubeconfigs are written under the helm-charts repo's `.secret/` and `local-setup/scripts/certs/` directories. Full details and troubleshooting are in the [local-setup README](https://github.com/platform-mesh/helm-charts/blob/main/local-setup/README.md).

#### Configure the environment

The backend loads its configuration from `backend/.env` (via `dotenv` in [`backend/src/app.module.ts`](backend/src/app.module.ts)). Create it from the template the first time:

```bash
cp backend/.env-example backend/.env
```

Then edit the values so they match your local-setup checkout. The variables in [`backend/.env-example`](backend/.env-example) are:

| Variable | Required | Purpose |
| --- | --- | --- |
| `KUBECONFIG` | yes | Path to the cluster kubeconfig from the local-setup (e.g. `.../helm-charts/.secret/operator-kubeconfig.yaml`). |
| `KUBECONFIG_KCP` | yes | Path to the kcp admin kubeconfig (e.g. `.../helm-charts/.secret/kcp/admin.kubeconfig`). |
| `NODE_EXTRA_CA_CERTS` | yes | Path to the local-setup CA so Node trusts `https://portal.localhost:8443` (e.g. `.../helm-charts/local-setup/scripts/certs/ca.crt`). |
| `OIDC_CLIENT_ID_DEFAULT` | yes | OIDC client id registered in the local-setup Keycloak (`welcome` for the default local-setup). |
| `BASE_DOMAINS_DEFAULT` | yes | Base domain the portal serves for the default IDP — `localhost`. |
| `KCP_URL` | yes | kcp API URL — `https://localhost:8443` for the local-setup. |
| `DISCOVERY_ENDPOINT` | yes | OIDC discovery URL template; `${org-name}` is substituted per organization: `https://portal.localhost:8443/keycloak/realms/${org-name}/.well-known/openid-configuration`. |
| `OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL` | yes | Gateway GraphQL URL injected into the portal context (`${org-subdomain}`/`${org-name}` are substituted per org). |
| `OPENMFP_PORTAL_CONTEXT_IAM_SERVICE_API_URL` | yes | IAM GraphQL URL injected into the portal context. |
| `CONTENT_CONFIGURATION_VALIDATOR_API_URL` | optional | Content-configuration validator endpoint. |
| `DEVELOPMENT_INSTANCE` | optional | `true` enables the local development mode features. |
| `ENVIRONMENT` | optional | Set to `local` for local development. |
| `PORT` | optional | Backend port (default `3000`; keep in sync with the frontend proxy target). |
| `VALID_WEBCOMPONENT_URLS` | optional | Regex of allowed web-component URLs. |
| `FEATURE_TOGGLES` | optional | Comma-separated feature toggles, e.g. `genericUI=true,terminal=true`. |
| `UI_OPTIONS` | optional | Extra UI options, e.g. `enableFeatureToggleSetting`. |

> The example uses `export VAR=...` lines so the file can also be `source`d into a shell; `dotenv` reads the same file directly, so either style works. The `*_DEFAULT` suffix corresponds to the default identity provider — additional IDPs get their own `OIDC_CLIENT_ID_<NAME>`, `BASE_DOMAINS_<NAME>` etc.

The **frontend** needs no `.env`; its only local wiring is the backend proxy target in `frontend/proxy.config.json`. If you change the backend `PORT`, update that `target` too.

#### Start the portal

With the local-setup running and `backend/.env` configured:

```bash
# from the repository root
npm start                   # frontend (:4300) + backend (:3000) via concurrently
```

Then open <http://localhost:4300>. Login redirects you to the local-setup's Keycloak; after authenticating you land in your locally running frontend, wired to the cluster's backend services.

Other useful root scripts (see [AGENTS.md](AGENTS.md) for the full list):

```bash
npm run start:ui            # frontend dev server only (:4300)
npm run start:server        # backend only (--debug --watch, :3000)
npm run start:watch         # backend (watch) + frontend build (watch)
```

### Working on the pm libraries at the same time (yalc)

If your change spans the portal **and** one of the platform-mesh libraries — the frontend `@platform-mesh/portal-ui-lib` or the backend `@platform-mesh/portal-server-lib` — use [`yalc`](https://github.com/wclr/yalc) to consume your local, unpublished build instead of the registry version. `yalc` copies a library's build output into the consuming project and rewrites the dependency to point at that local copy, so you can iterate without publishing to npm.

Install it once, globally:

```bash
npm i -g yalc
```

Both libraries are already wired for this in the repo — `frontend/package.json` and `backend/package.json` reference `"file:.yalc/@platform-mesh/..."` copies. And crucially, **both libraries ship a `build:watch` script** that rebuilds on every source change and immediately `yalc publish --push`es to all linked consumers. Combined with the portal's own watch mode, this gives you a fully live loop: edit the library, and the running portal updates itself with no manual publish/push/reinstall in between.

##### The live-reload loop

The smoothest workflow is: run the portal in watch mode, then run the library's `build:watch`. Two terminals, everything live.

**Terminal 1 — the portal, in watch mode:**

```bash
# in portal/  — frontend (build watch) + backend (start watch), both concurrently
npm run start:watch
```

`npm run start:watch` runs `start:server:watch` (backend `nest start --watch`) and `build:ui:watch` (frontend `ng build --watch`) together. Both watch their `.yalc` directory, so a `yalc push` from a library triggers a rebuild/restart automatically.

> Use `npm start` if you prefer the frontend dev **server** (`ng serve` on `:4300`, whose `nodemon.json` also watches `.yalc`); use `npm run start:watch` for the watch-build flow. Either one picks up yalc pushes live.

**Terminal 2 — the library you're changing, in watch mode** (see per-library commands below). Its `build:watch` does `rimraf dist && build && yalc publish --push --sig` on every save.

Now every save in the library rebuilds it, pushes it into the portal's `.yalc/`, and the portal rebuilds/restarts — no manual steps.

#### Frontend — `@platform-mesh/portal-ui-lib`

1. Link it into this repo's **frontend** (first time only), then reinstall:

   ```bash
   # in portal/frontend
   yalc add @platform-mesh/portal-ui-lib
   npm install
   ```

2. In your **portal-ui-lib** checkout, run its watch script and leave it running:

   ```bash
   # in the portal-ui-lib repo
   npm run build:watch
   ```

   `build:watch` runs `nodemon`, which on every change to `projects/`, `test-stubs/`, or `.yalc/` executes `rimraf dist && npm run build:dev && cd dist && yalc publish --push --sig`. Each save therefore rebuilds the lib into `dist/` and pushes it straight into the portal's `frontend/.yalc/`, and the portal's watch picks it up.

   To go back to the published version:

   ```bash
   # in portal/frontend
   yalc remove @platform-mesh/portal-ui-lib
   npm install
   ```

#### Backend — `@platform-mesh/portal-server-lib`

1. Link it into this repo's **backend** (first time only), then reinstall:

   ```bash
   # in portal/backend
   yalc add @platform-mesh/portal-server-lib
   npm install
   ```

2. In your **portal-server-lib** checkout, run its watch script and leave it running:

   ```bash
   # in the portal-server-lib repo
   npm run build:watch
   ```

   `build:watch` runs `nodemon --ignore dist --ext js,yml,yaml,ts,html,css,scss,json,md --exec "rimraf dist && npm run build && yalc publish --push --sig"`. Every save rebuilds and pushes into the portal's `backend/.yalc/`, and the backend (in `--watch` mode under `npm start` / `npm run start:watch`) restarts automatically.

   To go back to the published version:

   ```bash
   # in portal/backend
   yalc remove @platform-mesh/portal-server-lib
   npm install
   ```

> **Do not commit the yalc wiring.** The `.yalc/` directories, `yalc.lock`, and the `file:.yalc/...` references in `package.json`/`package-lock.json` are a local convenience. Run `yalc remove <pkg>` + `npm install` in the affected project to restore the registry version before opening a PR.

## Testing

> **NOTE:** You should always add tests, if you are adding code to our repository.

Run `npm test` to execute the unit tests via [Jest](https://jestjs.io/) in the root directory of the repository.

## Issues
We use GitHub issues to track bugs. Please ensure your description is
clear and includes sufficient instructions to reproduce the issue.

## License
By contributing to Platform Mesh, you agree that your contributions will be licensed
under its [Apache-2.0 license](LICENSE).
