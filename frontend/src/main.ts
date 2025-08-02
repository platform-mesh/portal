import { bootstrapApplication } from '@angular/platform-browser';
import {
  PortalComponent,
  PortalOptions,
  providePortal,
} from '@openmfp/portal-ui-lib';
import { PMStaticSettingsConfigService } from './app/services/pm-static-settings-config.service';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: PMStaticSettingsConfigService,
};

bootstrapApplication(PortalComponent, {
  providers: [providePortal(portalOptions)],
}).catch((err) => console.error(err));
