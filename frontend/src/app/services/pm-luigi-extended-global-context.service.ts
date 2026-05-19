import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LuigiExtendedGlobalContextConfigService } from '@openmfp/portal-ui-lib';
import { LuigiExtendedGlobalContextConfigServiceImpl } from '@platform-mesh/portal-ui-lib/portal-options';

@Injectable({ providedIn: 'root' })
export class PMLuigiExtendedGlobalContextService
  implements LuigiExtendedGlobalContextConfigService
{
  private http = inject(HttpClient);
  private base = inject(LuigiExtendedGlobalContextConfigServiceImpl);

  async createLuigiExtendedGlobalContext(): Promise<Record<string, any>> {
    const [baseContext, iasToken] = await Promise.all([
      this.base.createLuigiExtendedGlobalContext(),
      this.fetchIasToken(),
    ]);

    return { ...baseContext, iasToken };
  }

  private async fetchIasToken(): Promise<string | undefined> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ iasToken: string }>('/api/ias-token'),
      );
      return response.iasToken;
    } catch (e) {
      console.error('[portal] failed to fetch IAS token', e);
      return undefined;
    }
  }
}
