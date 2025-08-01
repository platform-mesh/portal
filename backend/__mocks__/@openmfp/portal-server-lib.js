// Mock implementation of @openmfp/portal-server-lib
// eslint-disable-next-line no-undef
module.exports = {
  EntityContextProvider: class EntityContextProvider {},
  EntityNotFoundException: class EntityNotFoundException extends Error {},
  HeaderParserService: class HeaderParserService {},
  EnvVariablesService: class EnvVariablesService {},
  EnvService: class EnvService {},
  EnvConfigVariables: class EnvConfigVariables {},
  DiscoveryService: class DiscoveryService {},
  PortalModule: class PortalModule {},
};
