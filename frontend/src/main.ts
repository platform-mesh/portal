import { routes } from './app/app.routes';
import { OpenPersistentPanelListener } from './app/services/persistent-panel/open-persistent-panel.listener';
import { PMCustomGlobalNodesService } from './app/services/pm-custom-global-nodes.service';
import { PMNodeChangeHookConfigService } from './app/services/pm-node-change-hook-config.service';
import { PMStaticSettingsConfigService } from './app/services/pm-static-settings-config.service';
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
  LuigiExtendedGlobalContextConfigServiceImpl,
  NavigationRedirectStrategyServiceImpl,
  NodeContextProcessingServiceImpl,
  UserProfileConfigServiceImpl,
} from '@platform-mesh/portal-ui-lib/portal-options';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: PMStaticSettingsConfigService,
  nodeChangeHookConfigService: PMNodeChangeHookConfigService,
  customMessageListeners: [OpenPersistentPanelListener],
  customGlobalNodesService: PMCustomGlobalNodesService,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    LuigiExtendedGlobalContextConfigServiceImpl,
  headerBarConfigService: HeaderBarConfigServiceImpl,
  userProfileConfigService: UserProfileConfigServiceImpl,
  routingConfigService: CustomRoutingConfigServiceImpl,
  navigationRedirectStrategy: NavigationRedirectStrategyServiceImpl,
};

bootstrapApplication(PortalComponent, {
  providers: [
    provideRouter(routes),
    providePortal(portalOptions),
    provideZonelessChangeDetection(),
  ],
}).catch((err) => {
  console.error(err);
});
