import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  PortalComponent,
  PortalOptions,
  providePortal,
} from '@openmfp/portal-ui-lib';
import {
  CustomRoutingConfigServiceImpl,
  HeaderBarConfigServiceImpl,
  NavigationRedirectStrategyServiceImpl,
  NodeChangeHookConfigServiceImpl,
  NodeContextProcessingServiceImpl,
  UserProfileConfigServiceImpl,
} from '@platform-mesh/portal-ui-lib/portal-options';
import { PMLuigiExtendedGlobalContextService } from './app/services/pm-luigi-extended-global-context.service';
import { routes } from './app/app.routes';
import { PMStaticSettingsConfigService } from './app/services/pm-static-settings-config.service';
import { PMCustomGlobalNodesService } from './app/services/pm-custom-global-nodes.service';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: PMStaticSettingsConfigService,
  nodeChangeHookConfigService: NodeChangeHookConfigServiceImpl,
  customGlobalNodesService: PMCustomGlobalNodesService,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    PMLuigiExtendedGlobalContextService,
  headerBarConfigService: HeaderBarConfigServiceImpl,
  userProfileConfigService: UserProfileConfigServiceImpl,
  routingConfigService: CustomRoutingConfigServiceImpl,
  navigationRedirectStrategy: NavigationRedirectStrategyServiceImpl
};

bootstrapApplication(PortalComponent, {
  providers: [
    provideRouter(routes),
    providePortal(portalOptions),
    provideZonelessChangeDetection(),
  ],
}).catch((err) => console.error(err));
