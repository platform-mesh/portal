import {
    ContentConfiguration,
    ServiceProviderResponse,
    ServiceProviderService,
} from '@openmfp/portal-server-lib';
import {GraphQLClient, gql} from 'graphql-request';
import {ContentConfigurationQueryResponse} from "./models/contentconfigurations.js";

export const contentConfigurationsQuery = gql`
    query {
        core_openmfp_io {
            ContentConfigurations { metadata { name labels } spec { remoteConfiguration { url } } status { configurationResult }}
        }
    }
`;

export class ContentConfigurationServiceProvidersService
    implements ServiceProviderService {
    private vsGatewayBaseUrl: string;

    constructor() {
        // TODO:FIXME: there must be a better way to get the base URL
        const gatewayUrl = process.env.OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL;
        this.vsGatewayBaseUrl = gatewayUrl.split('/').slice(0, -2).join('/') + `/virtual-workspace/contentconfigurations`
    }

    async getServiceProviders( token: string, entities: string[], context: Record<string, any>):
        Promise<ServiceProviderResponse> {

        let path = `/root:orgs:${context.organization}`;
        if (context?.account) {
            path += `:${context.account}`;
        }
        const client = new GraphQLClient(`${this.vsGatewayBaseUrl}${path}/graphql`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const response = await client.request<ContentConfigurationQueryResponse>(
            contentConfigurationsQuery, {}
        );

        const entity = !entities || !entities.length ? 'main' : entities[0];
        let contentConfigurations = response.core_openmfp_io.ContentConfigurations
            .filter((item) =>
                item.metadata.labels?.["portal.openmfp.org/entity"] === entity
            )
            .map((item) => {
                const contentConfiguration = JSON.parse(
                    item.status.configurationResult
                ) as ContentConfiguration;
                if (!contentConfiguration.url) {
                    contentConfiguration.url = item.spec.remoteConfiguration?.url;
                }
                return contentConfiguration;
            });

        return {
            rawServiceProviders: [
                {
                    name: 'openmfp-system',
                    displayName: '',
                    creationTimestamp: '',
                    contentConfiguration: contentConfigurations,
                },
            ],
        };
    }
}