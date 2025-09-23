import { routes } from './app/app.routes';
import { PMStaticSettingsConfigService } from './app/services/pm-static-settings-config.service';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  PortalComponent,
  PortalOptions,
  providePortal,
} from '@openmfp/portal-ui-lib';
import {
  CustomGlobalNodesServiceImpl,
  HeaderBarConfigServiceImpl,
  LuigiExtendedGlobalContextConfigServiceImpl,
  NodeChangeHookConfigServiceImpl,
  NodeContextProcessingServiceImpl,
  UserProfileConfigServiceImpl,
} from '@platform-mesh/portal-ui-lib/portal-options';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: PMStaticSettingsConfigService,
  nodeChangeHookConfigService: NodeChangeHookConfigServiceImpl,
  customGlobalNodesService: CustomGlobalNodesServiceImpl,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    LuigiExtendedGlobalContextConfigServiceImpl,
  headerBarConfigService: HeaderBarConfigServiceImpl,
  userProfileConfigService: UserProfileConfigServiceImpl,
  enableGettingStartedGlobalNode: true,
};

bootstrapApplication(PortalComponent, {
  providers: [provideRouter(routes), providePortal(portalOptions)],
}).catch((err) => console.error(err));
