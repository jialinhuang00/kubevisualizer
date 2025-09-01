import { Injectable, signal } from '@angular/core';
import { CommandTemplate } from '../../../shared/models/kubectl.models';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {

  getGeneralTemplates(): CommandTemplate[] {
    return [
      {
        id: 'view-1',
        name: 'Pod Details + SHA',
        command: 'kubectl get pods -n {namespace} -o "custom-columns=POD_NAME:.metadata.name,DEPLOYMENT:.metadata.ownerReferences[0].name,CONTAINER_NAME:.spec.containers[*].name,IMAGE_SHA:.status.containerStatuses[*].imageID"',
      },
      {
        id: 'view-2',
        name: 'Pod Images',
        command: 'kubectl get pods -n {namespace} -o custom-columns="POD_NAME:.metadata.name,IMAGE:.spec.containers[*].image" --no-headers',
      },
      {
        id: 'view-3',
        name: 'ReplicaSets Details',
        command: 'kubectl get replicasets -n {namespace} -o "custom-columns=REPLICASET:.metadata.name,DEPLOYMENT:.metadata.ownerReferences[0].name,DESIRED:.spec.replicas,CURRENT:.status.replicas,READY:.status.readyReplicas"',
      },
      {
        id: 'view-4',
        name: 'Deployments',
        command: 'kubectl get deployments -n {namespace}',
      },
      {
        id: 'view-5',
        name: 'Services',
        command: 'kubectl get services -n {namespace}',
      },
      {
        id: 'view-6',
        name: 'Events Timeline',
        command: 'kubectl get events -n {namespace} --sort-by=.metadata.creationTimestamp',
      },
      {
        id: 'config-1',
        name: 'Current Context',
        command: 'kubectl config current-context',
      },
      {
        id: 'config-2',
        name: 'All Contexts',
        command: 'kubectl config get-contexts',
      },
      {
        id: 'config-3',
        name: 'Node Status',
        command: 'kubectl get nodes -o wide',
      },
      {
        id: 'config-4',
        name: 'All Namespaces Pods',
        command: 'kubectl get pods --all-namespaces',
      }
    ];
  }

  generateDeploymentTemplates(deployments: string[]): CommandTemplate[] {
    if (deployments.length === 0) return [];

    return deployments.flatMap(dep => [
      {
        id: `deploy-${dep}-status`,
        name: `${dep} Rollout Status`,
        command: `kubectl rollout status deployment/${dep} -n {namespace}`,
      },
      {
        id: `deploy-${dep}-history`,
        name: `${dep} History`,
        command: `kubectl rollout history deployment/${dep} -n {namespace}`,
      },
      {
        id: `deploy-${dep}-describe`,
        name: `${dep} Details`,
        command: `kubectl describe deployment ${dep} -n {namespace}`
      },
      {
        id: `deploy-${dep}-rollback`,
        name: `${dep} Rollback`,
        command: `kubectl rollout undo deployment/${dep} -n {namespace}`
      }
    ]);
  }

  generatePodTemplates(pods: string[]): CommandTemplate[] {
    if (pods.length === 0) return [];

    return pods.flatMap(pod => [
      {
        id: `pod-${pod}-logs`,
        name: `${pod} Logs`,
        command: `kubectl logs ${pod} -n {namespace} --tail=50`
      },
      {
        id: `pod-${pod}-describe`,
        name: `${pod} Details`,
        command: `kubectl describe pod ${pod} -n {namespace}`
      },
      {
        id: `pod-${pod}-exec`,
        name: `${pod} Exec`,
        command: `kubectl exec -it ${pod} -n {namespace} -- /bin/sh`
      }
    ]);
  }

  replaceNamespacePlaceholder(command: string, namespace: string): string {
    return command.replace(/{namespace}/g, namespace);
  }
}