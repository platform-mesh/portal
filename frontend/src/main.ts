import { CustomGlobalNodesServiceImpl } from './app/services/custom-global-nodes.service';
import { LuigiExtendedGlobalContextConfigServiceImpl } from './app/services/luigi-extended-global-context-config.service';
import { NodeChangeHookConfigServiceImpl } from './app/services/node-change-hook-config.service';
import { NodeContextProcessingServiceImpl } from './app/services/node-context-processing.service';
import { PMStaticSettingsConfigService } from './app/services/pm-static-settings-config.service';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  PortalComponent,
  PortalOptions,
  providePortal,
} from '@openmfp/portal-ui-lib';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: PMStaticSettingsConfigService,
  nodeChangeHookConfigService: NodeChangeHookConfigServiceImpl,
  customGlobalNodesService: CustomGlobalNodesServiceImpl,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    LuigiExtendedGlobalContextConfigServiceImpl,
};

bootstrapApplication(PortalComponent, {
  providers: [providePortal(portalOptions)],
}).catch((err) => console.error(err));
