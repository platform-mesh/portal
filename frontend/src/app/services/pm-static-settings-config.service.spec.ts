import { describe, it, expect } from 'vitest';
import { PMStaticSettingsConfigService } from './pm-static-settings-config.service';

describe('PMStaticSettingsConfigService', () => {
  it('returns static settings with header and links', () => {
    const service = new PMStaticSettingsConfigService();
    const config = service.getStaticSettingsConfig();

    expect(config.header).toBeDefined();
    expect(config.header.title).toBe('Platform Mesh Portal');
    expect(config.header.logo).toBe('assets/logo.svg');
    expect(config.header.favicon).toBe('assets/logo.svg');
    expect(config.links).toHaveLength(2);
    expect(config.links[0]).toEqual({
      title: 'Platform Mesh',
      link: 'https://platform-mesh.io',
    });
    expect(config.links[1].title).toBe('Platform Mesh GitHub');
    expect(config.links[1].link).toBe('https://github.com/platform-mesh');
  });
});
