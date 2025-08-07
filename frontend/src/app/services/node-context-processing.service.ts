import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { Injectable, inject } from '@angular/core';
import {
  NodeContextProcessingService,
  ResourceService,
  replaceDotsAndHyphensWithUnderscores,
} from '@openmfp/portal-ui-lib';

@Injectable({
  providedIn: 'root',
})
export class NodeContextProcessingServiceImpl
  implements NodeContextProcessingService
{
  private resourceService = inject(ResourceService);

  public processNodeContext(
    entityId: string,
    entityNode: PortalLuigiNode,
    ctx: PortalNodeContext,
  ): void {
    this.readAndStoreEntityInNodeContext(entityId, entityNode, ctx);
  }

  private readAndStoreEntityInNodeContext(
    entityId: string,
    entityNode: PortalLuigiNode,
    ctx: PortalNodeContext,
  ) {
    const group = entityNode.defineEntity?.graphqlEntity?.group;
    const kind = entityNode.defineEntity?.graphqlEntity?.kind;
    const queryPart = entityNode.defineEntity?.graphqlEntity?.query;

    if (!entityId || !group || !kind || !queryPart) {
      return;
    }

    const operation = replaceDotsAndHyphensWithUnderscores(group);
    this.resourceService
      .read(
        entityId,
        operation,
        kind,
        `query ($name: String!) { ${operation} { ${kind}(name: $name) ${queryPart} }}`,
        {
          portalContext: {
            crdGatewayApiUrl: ctx.portalContext.crdGatewayApiUrl,
          },
          token: ctx.token,
        },
      )
      .subscribe({
        next: (entity) => {
          // update the current already calculated by Luigi context for a node
          ctx.entity = entity;
          ctx.entityId = `${entity.metadata?.annotations?.['kcp.io/cluster']}/${entityId}`;
          // update the node context of sa node to contain the entity for future context calculations
          entityNode.context.entity = entity;
          entityNode.context.entityId = ctx.entityId;
        },
        error: (err) =>
          console.error(
            `Not able to read entity ${entityId} from ${operation}`,
          ),
      });
  }
}
