import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import axios, { AxiosError } from 'axios';

const KEYCLOAK_URL =
  process.env.KEYCLOAK_INTERNAL_URL ||
  'http://keycloak.platform-mesh-system.svc.cluster.local:80/keycloak';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'sap';
const KEYCLOAK_IDP_ALIAS = process.env.KEYCLOAK_IDP_ALIAS || 'sap';
const KEYCLOAK_CLIENT_ID =
  process.env.KEYCLOAK_CLIENT_ID || '45e3cde8-cfb1-46f6-bcf2-3d73bce20ba9';
const KEYCLOAK_CLIENT_SECRET =
  process.env.KEYCLOAK_CLIENT_SECRET || '03PDSwt5QAHidllH718GOmgQuERPWwSd';

@Controller('api')
export class IasTokenController {
  @Get('ias-token')
  async getIasToken(@Req() req: Request): Promise<{ iasToken: string }> {
    const refreshToken: string | undefined =
      req.cookies?.['openmfp_auth_cookie'];
    if (!refreshToken) {
      throw new UnauthorizedException('No session cookie found');
    }

    const keycloakAccessToken = await this.fetchKeycloakAccessToken(refreshToken);
    const iasToken = await this.fetchIasTokenFromBroker(keycloakAccessToken);

    return { iasToken };
  }

  private async fetchKeycloakAccessToken(refreshToken: string): Promise<string> {
    try {
      const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
      const credentials = Buffer.from(
        `${KEYCLOAK_CLIENT_ID}:${KEYCLOAK_CLIENT_SECRET}`,
      ).toString('base64');
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
      const response = await axios.post<{ access_token?: string }>(
        tokenUrl,
        body.toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      const accessToken = response.data.access_token;
      if (!accessToken) {
        throw new InternalServerErrorException(
          'No access_token in token response',
        );
      }
      return accessToken;
    } catch (e: unknown) {
      if (e instanceof InternalServerErrorException) throw e;
      const detail = axiosErrorDetail(e);
      console.error(`[ias-token] token refresh failed: ${detail}`);
      throw new UnauthorizedException('Failed to refresh Keycloak token');
    }
  }

  private async fetchIasTokenFromBroker(
    keycloakAccessToken: string,
  ): Promise<string> {
    try {
      const brokerUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/broker/${KEYCLOAK_IDP_ALIAS}/token`;
      const response = await axios.get<{ access_token?: string }>(brokerUrl, {
        headers: {
          Authorization: `Bearer ${keycloakAccessToken}`,
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'portal.localhost:8443',
        },
      });
      const iasToken = response.data.access_token;
      if (!iasToken) {
        throw new InternalServerErrorException(
          'No access_token in broker response',
        );
      }
      return iasToken;
    } catch (e: unknown) {
      if (e instanceof InternalServerErrorException) throw e;
      const detail = axiosErrorDetail(e);
      console.error(`[ias-token] broker failed: ${detail}`);
      throw new UnauthorizedException(
        'Failed to retrieve IAS token from Keycloak broker',
      );
    }
  }
}

function axiosErrorDetail(e: unknown): string {
  if (e instanceof AxiosError) {
    return e.response?.data
      ? JSON.stringify(e.response.data)
      : (e.message ?? 'unknown');
  }
  return e instanceof Error ? e.message : 'unknown error';
}
