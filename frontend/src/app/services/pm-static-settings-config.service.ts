import { LuigiStaticSettings, StaticSettingsConfigService } from '@openmfp/portal-ui-lib';

export class PMStaticSettingsConfigService implements StaticSettingsConfigService {
  getStaticSettingsConfig() {
    const logo = 'assets/logo.svg';
    const settings: LuigiStaticSettings = {
      header: {
        title: 'Platform Mesh Portal',
        logo: logo,
        favicon: logo,
      },
      links: [
        { title: 'Platform Mesh', link: 'https://platform-mesh.io' },
        {
          title: 'Platform Mesh GitHub',
          link: 'https://github.com/platform-mesh',
        },
      ],
      experimental: {
        btpToolLayout: true,
        globalNav: true,
        navHeader: true,
      },
    };

    return settings as any;
  }
}
