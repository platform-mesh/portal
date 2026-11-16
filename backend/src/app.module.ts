import { Module } from '@nestjs/common';
import {
  CookiesService,
  PortalModule,
  PortalModuleOptions,
} from '@openmfp/portal-server-lib';
import {
  AccountEntityContextProvider,
  AuthzWebhookService,
  KcpKubernetesService,
  KubernetesServiceProvidersService,
  PermissionsController,
  PermissionsProxyService,
  PMAuthConfigProvider,
  PMLogoutService,
  PMPortalContextService,
  PMRequestContextProvider,
} from '@platform-mesh/portal-server-lib/portal-options';
import { config } from 'dotenv';
import { PMCookiesService } from './cookies.service.js';
import { PMEnvVariablesProvider } from './env-variables.provider.js';
import * as path from 'node:path';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

config({ path: './.env' });

const portalOptions: PortalModuleOptions = {
  frontendDistSources: path.join(
    __dirname,
    '../..',
    'frontend/dist/frontend/browser',
  ),
  envVariablesProvider: PMEnvVariablesProvider,
  requestContextProvider: PMRequestContextProvider,
  portalContextProvider: PMPortalContextService,
  entityContextProviders: {
    account: AccountEntityContextProvider,
  },
  additionalProviders: [
    KcpKubernetesService,
    AccountEntityContextProvider,
    PMPortalContextService,
    PMRequestContextProvider,
    PMAuthConfigProvider,
    PermissionsProxyService,
    AuthzWebhookService,
    { provide: CookiesService, useClass: PMCookiesService },
  ],
  additionalControllers: [PermissionsController],
  serviceProviderService: KubernetesServiceProvidersService,
  authConfigProvider: PMAuthConfigProvider,
  logoutCallbackProvider: PMLogoutService,
};

@Module({
  imports: [PortalModule.create(portalOptions)],
})
export class AppModule {}
