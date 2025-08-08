import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';
import { Injectable, inject } from '@angular/core';
import {
  GatewayService,
  LuigiCoreService,
  NodeChangeHookConfigService,
} from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class NodeChangeHookConfigServiceImpl
  implements NodeChangeHookConfigService
{
  private luigiCoreService = inject(LuigiCoreService);
  private gatewayService = inject(GatewayService);

  nodeChangeHook(prevNode: PortalLuigiNode, nextNode: PortalLuigiNode) {
    if (
      nextNode.initialRoute &&
      nextNode.virtualTree &&
      !(nextNode as any)._virtualTree
    ) {
      this.luigiCoreService.navigation().navigate(nextNode.initialRoute);
    }

    this.resolveCrdGatewayKcpPath(nextNode);
  }

  private resolveCrdGatewayKcpPath(nextNode: PortalLuigiNode) {
    let entityKcpPath = '';
    let node: PortalLuigiNode | undefined = nextNode;
    do {
      const id = node.context?.entityContext?.account?.id;
      if (id && !entityKcpPath.includes(id)) {
        entityKcpPath = `:${id}${entityKcpPath}`;
      }
      node = node.parent;
    } while (node);

    const org = this.luigiCoreService.getGlobalContext().organization;
    const kcpPath =
      nextNode.context?.kcpPath || `${kcpRootOrgsPath}:${org}${entityKcpPath}`;
    this.gatewayService.updateCrdGatewayUrlWithEntityPath(kcpPath);
  }
}
