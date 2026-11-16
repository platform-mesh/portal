import { AuthTokenData, CookiesService } from '@openmfp/portal-server-lib';
import type { Request, Response } from 'express';
import { PMCookiesService } from './cookies.service';

describe('PMCookiesService', () => {
  const originalEnv = process.env;
  const request = {} as Request;
  const tokens = { refresh_token: 'refresh-token' } as AuthTokenData;
  const baseDomainOptions = {
    domain: 'example.com',
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'strict',
  };
  let response: Response;
  let service: PMCookiesService;

  beforeEach(() => {
    process.env = { ...originalEnv, BASE_DOMAINS_DEFAULT: 'example.com' };
    response = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
    service = new PMCookiesService();
    jest.spyOn(CookiesService.prototype, 'setAuthCookie');
    jest.spyOn(CookiesService.prototype, 'removeAuthCookie');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('with the callback on the base domain', () => {
    beforeEach(() => {
      process.env.OIDC_CALLBACK_ON_BASE_DOMAIN = 'true';
    });

    it('sets the auth cookie for the base domain', () => {
      service.setAuthCookie(request, response, tokens);

      expect(response.cookie).toHaveBeenCalledWith(
        'openmfp_auth_cookie',
        'refresh-token',
        baseDomainOptions,
      );
      expect(CookiesService.prototype.setAuthCookie).not.toHaveBeenCalled();
    });

    it('removes the auth cookie of the base domain', () => {
      service.removeAuthCookie(request, response);

      expect(response.clearCookie).toHaveBeenCalledWith(
        'openmfp_auth_cookie',
        baseDomainOptions,
      );
      expect(CookiesService.prototype.removeAuthCookie).not.toHaveBeenCalled();
    });
  });

  describe('with a callback per organization', () => {
    beforeEach(() => {
      delete process.env.OIDC_CALLBACK_ON_BASE_DOMAIN;
    });

    it('leaves setting the auth cookie to the library', () => {
      service.setAuthCookie(request, response, tokens);

      expect(CookiesService.prototype.setAuthCookie).toHaveBeenCalledWith(
        request,
        response,
        tokens,
      );
      expect(response.cookie).not.toHaveBeenCalled();
    });

    it('leaves removing the auth cookie to the library', () => {
      service.removeAuthCookie(request, response);

      expect(CookiesService.prototype.removeAuthCookie).toHaveBeenCalledWith(
        request,
        response,
      );
      expect(response.clearCookie).not.toHaveBeenCalled();
    });
  });
});
