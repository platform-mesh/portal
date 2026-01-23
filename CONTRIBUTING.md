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

Run `npm start` to run the project.

### Testing changes to portal-server-lib locally

If you need to make changes to `@platform-mesh/portal-server-lib` and test them locally:

1. **Open a PR** in the [portal-server-lib](https://github.com/platform-mesh/portal-server-lib) repository with your changes.

2. **Install your branch** into the backend:
   ```bash
   cd backend
   npm install github:platform-mesh/portal-server-lib#your-branch-name
   ```

3. **Add the postinstall script** to `backend/package.json` (do not commit this change):
   ```json
   "scripts": {
     "postinstall": "(cd node_modules/@platform-mesh/portal-server-lib && [ ! -d dist ] && npm install && npm run build || true) && rm -rf node_modules/@platform-mesh/portal-server-lib/node_modules",
     ...
   }
   ```
   This script builds the package from source and removes nested dependencies to prevent NestJS dependency injection errors.

4. **Build and load the Docker image** into your local-setup:
   ```bash
   podman build --no-cache -t your-image-name .
   ```

## Testing

> **NOTE:** You should always add tests, if you are adding code to our repository.

Run `npm test` to execute the unit tests via [Jest](https://jestjs.io/) in the root directory of the repository.

## Issues
We use GitHub issues to track bugs. Please ensure your description is
clear and includes sufficient instructions to reproduce the issue.

## License
By contributing to Platform Mesh, you agree that your contributions will be licensed
under its [Apache-2.0 license](LICENSE).
