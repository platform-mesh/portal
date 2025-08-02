import { StaticSettingsConfigService } from '@openmfp/portal-ui-lib';

export class PMStaticSettingsConfigService implements StaticSettingsConfigService
{
  getStaticSettingsConfig() {
    const logo = 'assets/logo.svg';
    const settings: any = {
      header: {
        title: 'Platform Mesh Portal',
        logo: logo,
        favicon: logo,
      },
    };

    return settings;
  }
}
