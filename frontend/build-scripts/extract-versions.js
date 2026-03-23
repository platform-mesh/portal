const packageLockJson = require('../package-lock.json');
const fs = require('fs');
const path = require('path');

const config = {
  portal: packageLockJson.version,
  angularCore: packageLockJson.packages['node_modules/@angular/core']?.version,
  openmfpPortalUi:
    packageLockJson.packages['node_modules/@openmfp/portal-ui-lib']?.version,
  platformMeshPortalUi:
    packageLockJson.packages['node_modules/@platform-mesh/portal-ui-lib']
      ?.version,
  luigiCore:
    packageLockJson.packages['node_modules/@luigi-project/core']?.version,
  luigiClient:
    packageLockJson.packages['node_modules/@luigi-project/client']?.version,
  ui5WebComponentsViaFundamentalsNgx:
    packageLockJson.packages['node_modules/@fundamental-ngx/ui5-webcomponents']
      ?.version,
};

for (const [key] of Object.entries(config)) {
  if (!config[key]) {
    delete config[key];
  }
}

const outputPath = path.resolve(
  __dirname,
  '../',
  'src',
  'assets',
  'dependencies-versions.json',
);

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
