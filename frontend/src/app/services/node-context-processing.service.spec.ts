import { PortalNodeContext } from '../models/luigi-context';
import { NodeContextProcessingServiceImpl } from './node-context-processing.service';
import { TestBed } from '@angular/core/testing';
import {
  LuigiCoreService,
  Resource,
  ResourceService,
} from '@openmfp/portal-ui-lib';
import { of, throwError } from 'rxjs';

describe('NodeContextProcessingServiceImpl', () => {
  let service: NodeContextProcessingServiceImpl;
  let mockResourceService: jest.Mocked<ResourceService>;
  let mockLuigiCoreService: jest.Mocked<LuigiCoreService>;

  beforeEach(() => {
    mockResourceService = {
      read: jest.fn(),
    } as unknown as jest.Mocked<ResourceService>;

    mockLuigiCoreService = {
      getGlobalContext: jest.fn(),
    } as unknown as jest.Mocked<LuigiCoreService>;

    TestBed.configureTestingModule({
      providers: [
        NodeContextProcessingServiceImpl,
        { provide: ResourceService, useValue: mockResourceService },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });

    service = TestBed.inject(NodeContextProcessingServiceImpl);
  });

  it('should not call read if entityId or graphqlEntity fields are missing', () => {
    const ctx: any = {};
    const node: any = {
      defineEntity: {
        graphqlEntity: {
          group: '',
          kind: 'Kind',
          query: '{ id }',
        },
      },
      context: {},
    };

    service.processNodeContext('', node, ctx);
    expect(mockResourceService.read).not.toHaveBeenCalled();

    service.processNodeContext('id', { defineEntity: {} } as any, ctx);
    expect(mockResourceService.read).not.toHaveBeenCalled();
  });

  it('should call read and update entity in context', () => {
    const node: any = {
      defineEntity: {
        graphqlEntity: {
          group: 'test.group',
          kind: 'EntityKind',
          query: '{ id name }',
        },
      },
      context: {},
    };

    const entity: Resource = {
      metadata: {
        name: 'entity-name',
        namespace: 'default',
        uid: 'uid-123',
      },
      spec: {
        type: '2',
      },
      status: {
        conditions: [],
      },
    };

    const ctx: PortalNodeContext = {
      portalContext: {
        crdGatewayApiUrl: 'abc',
      },
      userId: 'user-123',
      userEmail: 'user@example.com',
      token: 'token123',
      organization: 'org-name',
      portalBaseUrl: 'https://example.com',
    };

    mockResourceService.read.mockReturnValue(of(entity));

    service.processNodeContext('1', node, ctx);

    expect(mockResourceService.read).toHaveBeenCalledWith(
      '1',
      'test_group',
      'EntityKind',
      'query ($name: String!) { test_group { EntityKind(name: $name) { id name } }}',
      {
        portalContext: {
          crdGatewayApiUrl: ctx.portalContext.crdGatewayApiUrl,
        },
        token: ctx.token,
      },
    );
    expect(ctx.entity).toEqual(entity);
    expect(node.context.entity).toEqual(entity);
  });

  it('should handle read error and not update context', () => {
    const ctx: any = {
      portalContext: {},
      userId: 'u',
      userEmail: 'e',
      token: 't',
      organization: 'o',
    };
    const node: any = {
      defineEntity: {
        graphqlEntity: {
          group: 'some.group',
          kind: 'SomeKind',
          query: '{ name }',
        },
      },
      context: {},
    };

    mockResourceService.read.mockReturnValue(
      throwError(() => new Error('fail')),
    );

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    service.processNodeContext('x', node, ctx);

    expect(mockResourceService.read).toHaveBeenCalled();
    expect(ctx.entity).toBeUndefined();
    expect(node.context.entity).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      'Not able to read entity x from some_group',
    );

    errorSpy.mockRestore();
  });
});
