import { Module } from '@nestjs/common';
import { PortalModule, PortalModuleOptions } from '@openmfp/portal-server-lib';
import * as path from 'node:path';
import { AccountEntityContextProvider } from './entity-context-provider/account-entity-context-provider.service.js';
import { OpenmfpPortalContextService } from './portal-context-provider/openmfp-portal-context.service.js';
import { RequestContextProviderImpl } from './request-context-provider/openmfp-request-context-provider.js';
import { ContentConfigurationServiceProvidersService } from './service-providers/content-configuration-service-providers.service.js';
import { config } from 'dotenv';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

config({ path: './.env' });

const portalOptions: PortalModuleOptions = {
  frontendDistSources: path.join(
    __dirname,
    '../..',
    'frontend/dist/frontend/browser'
  ),
  requestContextProvider: RequestContextProviderImpl,
  portalContextProvider: OpenmfpPortalContextService,
  entityContextProviders: {
    account: AccountEntityContextProvider,
  },
  additionalProviders: [
    AccountEntityContextProvider,
    OpenmfpPortalContextService,
  ],
  serviceProviderService: ContentConfigurationServiceProvidersService,
};

@Module({
  imports: [PortalModule.create(portalOptions)],
})
export class AppModule {}
