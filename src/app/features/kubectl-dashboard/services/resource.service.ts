import { Injectable, inject, signal } from '@angular/core';
import { KubectlService } from '../../../core/services/kubectl.service';
import { TemplateService } from './template.service';
import { CommandTemplate } from '../../../shared/models/kubectl.models';

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private kubectlService = inject(KubectlService);
  private templateService = inject(TemplateService);

  // Resource data
  namespaces = signal<string[]>([]);
  deployments = signal<string[]>([]);
  pods = signal<string[]>([]);
  
  // Template data  
  generalTemplates = signal<CommandTemplate[]>([]);
  deploymentTemplates = signal<CommandTemplate[]>([]);
  podTemplates = signal<CommandTemplate[]>([]);

  async initialize() {
    await this.loadNamespaces();
    this.generalTemplates.set(this.templateService.getGeneralTemplates());
  }

  async loadNamespaces() {
    try {
      const namespaces = await this.kubectlService.getNamespaces();
      this.namespaces.set(namespaces);
    } catch (error) {
      console.error('Failed to load namespaces:', error);
      this.namespaces.set(['default', 'noah', 'staging', 'production']);
    }
  }

  async loadResourcesForNamespace(namespace: string) {
    if (!namespace) return;
    
    try {
      // Load deployments and update templates
      const deployments = await this.kubectlService.getDeployments(namespace);
      this.deployments.set(deployments);
      this.deploymentTemplates.set(this.templateService.generateDeploymentTemplates(deployments));
      
      // Load pods and update templates
      const pods = await this.kubectlService.getPods(namespace);
      this.pods.set(pods);
      this.podTemplates.set(this.templateService.generatePodTemplates(pods));
      
    } catch (error) {
      console.error('Failed to load resources:', error);
      this.deployments.set([]);
      this.pods.set([]);
      this.deploymentTemplates.set([]);
      this.podTemplates.set([]);
    }
  }

  executeTemplate(template: CommandTemplate, namespace: string): string {
    return this.templateService.replaceNamespacePlaceholder(template.command, namespace);
  }
}