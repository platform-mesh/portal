import { Module } from '@nestjs/common';
import { PortalModule, PortalModuleOptions } from '@openmfp/portal-server-lib';
import {
  AccountEntityContextProvider,
  AuthCallbackProvider,
  IAMGraphQlService,
  KcpKubernetesService,
  KubernetesServiceProvidersService,
  PMAuthConfigProvider,
  PMLogoutService,
  PMPortalContextService,
  PMRequestContextProvider,
} from '@platform-mesh/portal-server-lib/portal-options';
import { config } from 'dotenv';
import * as path from 'node:path';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

config({ path: './.env' });

const authCallbackProvider = process.env.ENABLE_IAM_USER_ONBOARD
  ? AuthCallbackProvider
  : null;

const portalOptions: PortalModuleOptions = {
  frontendDistSources: path.join(
    __dirname,
    '../..',
    'frontend/dist/frontend/browser',
  ),
  requestContextProvider: PMRequestContextProvider,
  portalContextProvider: PMPortalContextService,
  entityContextProviders: {
    account: AccountEntityContextProvider,
  },
  additionalProviders: [
    KcpKubernetesService,
    AccountEntityContextProvider,
    PMPortalContextService,
    IAMGraphQlService,
    PMRequestContextProvider,
    PMAuthConfigProvider,
  ],
  serviceProviderService: KubernetesServiceProvidersService,
  authConfigProvider: PMAuthConfigProvider,
  logoutCallbackProvider: PMLogoutService,
  authCallbackProvider,
};

@Module({
  imports: [PortalModule.create(portalOptions)],
})
export class AppModule {}
