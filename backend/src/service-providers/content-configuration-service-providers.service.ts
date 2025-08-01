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
        if (!gatewayUrl) {
            throw new Error('OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL environment variable is required');
        }
        this.vsGatewayBaseUrl = gatewayUrl.split('/').slice(0, -2).join('/') + `/virtual-workspace/contentconfigurations`
    }

    async getServiceProviders( token: string, entities: string[], context: Record<string, any>):
        Promise<ServiceProviderResponse> {

        // Validate required parameters
        if (!token) {
            throw new Error('Token is required');
        }
        if (!context?.organization) {
            throw new Error('Context with organization is required');
        }

        let path = `/root:orgs:${context.organization}`;
        if (context?.account) {
            path += `:${context.account}`;
        }
        
        const client = new GraphQLClient(`${this.vsGatewayBaseUrl}${path}/graphql`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        try {
            const response = await client.request<ContentConfigurationQueryResponse>(
                contentConfigurationsQuery, {}
            );

            // Validate response structure
            if (!response?.core_openmfp_io?.ContentConfigurations) {
                throw new Error('Invalid response structure: missing ContentConfigurations');
            }

            const entity = !entities || !entities.length ? 'main' : entities[0];
            let contentConfigurations = response.core_openmfp_io.ContentConfigurations
                .filter((item) =>
                    item.metadata.labels?.["portal.openmfp.org/entity"] === entity
                )
                .map((item) => {
                    try {
                        // Validate required fields
                        if (!item.status?.configurationResult) {
                            throw new Error(`Missing configurationResult for item: ${item.metadata?.name || 'unknown'}`);
                        }

                        const contentConfiguration = JSON.parse(
                            item.status.configurationResult
                        ) as ContentConfiguration;
                        
                        if (!contentConfiguration.url) {
                            contentConfiguration.url = item.spec.remoteConfiguration?.url;
                        }
                        return contentConfiguration;
                    } catch (parseError) {
                        // Log the error but don't fail the entire operation
                        console.error(`Failed to parse configuration for item ${item.metadata?.name || 'unknown'}:`, parseError);
                        
                        // Re-throw specific errors as-is, others as JSON parse errors
                        if (parseError instanceof Error && parseError.message.includes('Missing configurationResult')) {
                            throw parseError;
                        }
                        throw new Error(`Invalid JSON in configurationResult for item: ${item.metadata?.name || 'unknown'}`);
                    }
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
        } catch (error) {
            // Re-throw with more context if it's not already our custom error
            if (error instanceof Error && error.message.includes('configurationResult')) {
                throw error;
            }
            throw new Error(`Failed to fetch content configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
