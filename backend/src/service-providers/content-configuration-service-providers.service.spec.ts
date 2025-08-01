import { ContentConfigurationServiceProvidersService, contentConfigurationsQuery } from './content-configuration-service-providers.service.js'
import { GraphQLClient } from 'graphql-request';
import { ContentConfigurationQueryResponse } from './models/contentconfigurations.js';

// Mock GraphQLClient
jest.mock('graphql-request', () => ({
  GraphQLClient: jest.fn(),
  gql: jest.fn((query) => query),
}));

describe('ContentConfigurationServiceProvidersService', () => {
  let service: ContentConfigurationServiceProvidersService;
  let mockGraphQLClient: jest.Mocked<GraphQLClient>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = process.env;
    
    // Set up environment variable
    process.env.OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL = 'https://example.com/api/v1/gateway';
    
    // Create mock GraphQL client
    mockGraphQLClient = {
      request: jest.fn(),
    } as any;
    
    (GraphQLClient as jest.MockedClass<typeof GraphQLClient>).mockImplementation(() => mockGraphQLClient);
    
    service = new ContentConfigurationServiceProvidersService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct vsGatewayBaseUrl', () => {
      expect(service['vsGatewayBaseUrl']).toBe('https://example.com/api/virtual-workspace/contentconfigurations');
    });

    it('should handle different gateway URL formats', () => {
      process.env.OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL = 'https://test.com/api/v2/gateway/endpoint';
      const newService = new ContentConfigurationServiceProvidersService();
      expect(newService['vsGatewayBaseUrl']).toBe('https://test.com/api/v2/virtual-workspace/contentconfigurations');
    });

    it('should throw error when environment variable is missing', () => {
      delete process.env.OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL;
      expect(() => new ContentConfigurationServiceProvidersService())
        .toThrow('OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL environment variable is required');
    });

    it('should throw error when environment variable is empty', () => {
      process.env.OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL = '';
      expect(() => new ContentConfigurationServiceProvidersService())
        .toThrow('OPENMFP_PORTAL_CONTEXT_CRD_GATEWAY_API_URL environment variable is required');
    });
  });

  describe('getServiceProviders', () => {
    const mockToken = 'test-token';
    const mockContext = { organization: 'test-org', account: 'test-account' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully fetch and process content configurations', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {
                remoteConfiguration: {
                  url: 'https://remote.example.com'
                }
              },
              status: {
                configurationResult: JSON.stringify({
                  name: 'Test Configuration',
                  description: 'Test description'
                })
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, ['main'], mockContext);

      expect(GraphQLClient).toHaveBeenCalledWith(
        'https://example.com/api/virtual-workspace/contentconfigurations/root:orgs:test-org:test-account/graphql',
        {
          headers: {
            Authorization: 'Bearer test-token'
          }
        }
      );

      expect(mockGraphQLClient.request).toHaveBeenCalledWith(contentConfigurationsQuery, {});

      expect(result).toEqual({
        rawServiceProviders: [
          {
            name: 'openmfp-system',
            displayName: '',
            creationTimestamp: '',
            contentConfiguration: [
              {
                name: 'Test Configuration',
                description: 'Test description',
                url: 'https://remote.example.com'
              }
            ]
          }
        ]
      });
    });

    it('should handle context without account', async () => {
      const contextWithoutAccount = { organization: 'test-org' };
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: []
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      await service.getServiceProviders(mockToken, ['main'], contextWithoutAccount);

      expect(GraphQLClient).toHaveBeenCalledWith(
        'https://example.com/api/virtual-workspace/contentconfigurations/root:orgs:test-org/graphql',
        {
          headers: {
            Authorization: 'Bearer test-token'
          }
        }
      );
    });

    it('should use "main" entity when entities array is empty', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {},
              status: {
                configurationResult: JSON.stringify({ name: 'Test' })
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, [], mockContext);

      expect(result.rawServiceProviders[0].contentConfiguration).toHaveLength(1);
    });

    it('should use "main" entity when entities is null or undefined', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {},
              status: {
                configurationResult: JSON.stringify({ name: 'Test' })
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, null as any, mockContext);

      expect(result.rawServiceProviders[0].contentConfiguration).toHaveLength(1);
    });

    it('should filter configurations by entity label', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'config-1',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {},
              status: {
                configurationResult: JSON.stringify({ name: 'Config 1' })
              }
            },
            {
              metadata: {
                name: 'config-2',
                labels: {
                  'portal.openmfp.org/entity': 'other'
                }
              },
              spec: {},
              status: {
                configurationResult: JSON.stringify({ name: 'Config 2' })
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, ['main'], mockContext);

      expect(result.rawServiceProviders[0].contentConfiguration).toHaveLength(1);
      expect(result.rawServiceProviders[0].contentConfiguration[0].name).toBe('Config 1');
    });

    it('should handle configurations without labels', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'config-without-labels'
              },
              spec: {},
              status: {
                configurationResult: JSON.stringify({ name: 'Config Without Labels' })
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, ['main'], mockContext);

      expect(result.rawServiceProviders[0].contentConfiguration).toHaveLength(0);
    });

    it('should add URL from spec when not present in configuration result', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {
                remoteConfiguration: {
                  url: 'https://spec.example.com'
                }
              },
              status: {
                configurationResult: JSON.stringify({
                  name: 'Test Configuration'
                  // No URL in configuration result
                })
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, ['main'], mockContext);

      expect(result.rawServiceProviders[0].contentConfiguration[0].url).toBe('https://spec.example.com');
    });

    it('should not override URL if already present in configuration result', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {
                remoteConfiguration: {
                  url: 'https://spec.example.com'
                }
              },
              status: {
                configurationResult: JSON.stringify({
                  name: 'Test Configuration',
                  url: 'https://config.example.com'
                })
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, ['main'], mockContext);

      expect(result.rawServiceProviders[0].contentConfiguration[0].url).toBe('https://config.example.com');
    });

    it('should handle empty ContentConfigurations array', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: []
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      const result = await service.getServiceProviders(mockToken, ['main'], mockContext);

      expect(result).toEqual({
        rawServiceProviders: [
          {
            name: 'openmfp-system',
            displayName: '',
            creationTimestamp: '',
            contentConfiguration: []
          }
        ]
      });
    });

    it('should handle GraphQL request errors', async () => {
      const error = new Error('GraphQL request failed');
      mockGraphQLClient.request.mockRejectedValue(error);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('GraphQL request failed');
    });

    it('should handle invalid JSON in configurationResult', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {},
              status: {
                configurationResult: 'invalid-json'
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow();
    });

    it('should handle missing configurationResult', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {},
              status: {}
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('Missing configurationResult for item: test-config');
    });

    // New validation tests
    it('should throw error when token is missing', async () => {
      await expect(service.getServiceProviders('', ['main'], mockContext))
        .rejects.toThrow('Token is required');
    });

    it('should throw error when token is null', async () => {
      await expect(service.getServiceProviders(null as any, ['main'], mockContext))
        .rejects.toThrow('Token is required');
    });

    it('should throw error when context is missing', async () => {
      await expect(service.getServiceProviders(mockToken, ['main'], null as any))
        .rejects.toThrow('Context with organization is required');
    });

    it('should throw error when context organization is missing', async () => {
      await expect(service.getServiceProviders(mockToken, ['main'], {}))
        .rejects.toThrow('Context with organization is required');
    });

    it('should throw error when context organization is empty', async () => {
      await expect(service.getServiceProviders(mockToken, ['main'], { organization: '' }))
        .rejects.toThrow('Context with organization is required');
    });

    it('should handle invalid response structure - missing core_openmfp_io', async () => {
      const mockResponse = {} as any;
      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('Invalid response structure: missing ContentConfigurations');
    });

    it('should handle invalid response structure - missing ContentConfigurations', async () => {
      const mockResponse = {
        core_openmfp_io: {}
      } as any;
      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('Invalid response structure: missing ContentConfigurations');
    });

    it('should provide detailed error message for JSON parse failures', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                name: 'test-config-with-bad-json',
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {},
              status: {
                configurationResult: '{ invalid json'
              }
            }
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('Invalid JSON in configurationResult for item: test-config-with-bad-json');
    });

    it('should handle items without metadata name in error messages', async () => {
      const mockResponse: ContentConfigurationQueryResponse = {
        core_openmfp_io: {
          ContentConfigurations: [
            {
              metadata: {
                labels: {
                  'portal.openmfp.org/entity': 'main'
                }
              },
              spec: {},
              status: {}
            } as any
          ]
        }
      };

      mockGraphQLClient.request.mockResolvedValue(mockResponse);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('Missing configurationResult for item: unknown');
    });

    it('should wrap GraphQL errors with context', async () => {
      const originalError = new Error('Network timeout');
      mockGraphQLClient.request.mockRejectedValue(originalError);

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('Failed to fetch content configurations: Network timeout');
    });

    it('should handle non-Error objects thrown by GraphQL client', async () => {
      mockGraphQLClient.request.mockRejectedValue('String error');

      await expect(service.getServiceProviders(mockToken, ['main'], mockContext))
        .rejects.toThrow('Failed to fetch content configurations: Unknown error');
    });
  });
});
