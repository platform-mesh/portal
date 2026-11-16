import { Injectable } from '@nestjs/common';
import { AuthTokenData, CookiesService } from '@openmfp/portal-server-lib';
import type { CookieOptions, Request, Response } from 'express';

// Name of the auth cookie of @openmfp/portal-server-lib, which does not export it.
const AUTH_COOKIE = 'openmfp_auth_cookie';

// OIDC_CALLBACK_ON_BASE_DOMAIN: every login completes on the base domain,
// for identity providers that accept only exactly registered redirect URIs.
export const callbackOnBaseDomain = (): boolean =>
  process.env.OIDC_CALLBACK_ON_BASE_DOMAIN === 'true';

const baseDomainCookieOptions = (): CookieOptions => ({
  domain: process.env.BASE_DOMAINS_DEFAULT,
  httpOnly: true,
  secure: true,
  path: '/',
  sameSite: 'strict',
});

// A login completed on the base domain has to be visible on the
// organization subdomains, so the auth cookie belongs to the base domain.
@Injectable()
export class PMCookiesService extends CookiesService {
  override setAuthCookie(
    request: Request,
    response: Response,
    authTokenResponse: AuthTokenData,
  ): void {
    if (!callbackOnBaseDomain()) {
      super.setAuthCookie(request, response, authTokenResponse);
      return;
    }
    response.cookie(
      AUTH_COOKIE,
      authTokenResponse.refresh_token,
      baseDomainCookieOptions(),
    );
  }

  override removeAuthCookie(request: Request, response: Response): void {
    if (!callbackOnBaseDomain()) {
      super.removeAuthCookie(request, response);
      return;
    }
    response.clearCookie(AUTH_COOKIE, baseDomainCookieOptions());
  }
}
