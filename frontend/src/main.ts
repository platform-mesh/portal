import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  PortalComponent,
  PortalOptions,
  providePortal,
} from '@openmfp/portal-ui-lib';
import {
  CustomGlobalNodesServiceImpl,
  CustomRoutingConfigServiceImpl,
  HeaderBarConfigServiceImpl,
  LuigiExtendedGlobalContextConfigServiceImpl,
  NavigationRedirectStrategyServiceImpl,
  NodeChangeHookConfigServiceImpl,
  NodeContextProcessingServiceImpl,
  UserProfileConfigServiceImpl,
} from '@platform-mesh/portal-ui-lib/portal-options';
import { routes } from './app/app.routes';
import { PMStaticSettingsConfigService } from './app/services/pm-static-settings-config.service';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: PMStaticSettingsConfigService,
  nodeChangeHookConfigService: NodeChangeHookConfigServiceImpl,
  customGlobalNodesService: CustomGlobalNodesServiceImpl,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    LuigiExtendedGlobalContextConfigServiceImpl,
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
