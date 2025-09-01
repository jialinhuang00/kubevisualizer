import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ResourceService } from '../services/resource.service';
import { KubectlService } from '../../../core/services/kubectl.service';
import { OutputParserService } from '../services/output-parser.service';
import { KubeResource, PodDescribeData, CommandTemplate } from '../../../shared/models/kubectl.models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private resourceService = inject(ResourceService);
  private kubectlService = inject(KubectlService);
  private outputParserService = inject(OutputParserService);
  protected readonly title = signal('kubecmds-viz');

  async ngOnInit() {
    await this.resourceService.initialize();
    await this.resourceService.loadResourcesForNamespace(this.selectedNamespace());
  }

  customCommand = signal<string>('kubectl get pods -n default -o wide');
  results = signal<KubeResource[]>([]);
  isLoading = signal<boolean>(false);
  commandOutput = signal<string>('');
  headers = signal<string[]>([]);
  hasEventsTable = signal<boolean>(false);
  isResourceDetailsExpanded = signal<boolean>(false);
  podDescribeData = signal<PodDescribeData[]>([]);
  expandedPods = signal<Set<string>>(new Set());
  selectedNamespace = signal<string>('noah');

  // Accordion states
  isGeneralExpanded = signal<boolean>(true);
  isDeploymentExpanded = signal<boolean>(true);
  isPodSectionExpanded = signal<boolean>(true);

  // Expose service signals to template
  get namespaces() { return this.resourceService.namespaces; }
  get deployments() { return this.resourceService.deployments; }
  get pods() { return this.resourceService.pods; }
  get generalTemplates() { return this.resourceService.generalTemplates; }
  get deploymentTemplates() { return this.resourceService.deploymentTemplates; }
  get podTemplates() { return this.resourceService.podTemplates; }

  onCustomCommandChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.customCommand.set(target.value);
  }

  async executeCustomCommand() {
    const command = this.customCommand();
    if (!command.trim()) return;

    this.isLoading.set(true);
    this.commandOutput.set('');
    this.results.set([]);
    this.hasEventsTable.set(false);
    this.isResourceDetailsExpanded.set(false);
    this.podDescribeData.set([]);
    this.expandedPods.set(new Set());

    try {
      const response = await this.kubectlService.executeCommand(command);
      
      if (response.success) {
        const parsedOutput = this.outputParserService.parseCommandOutput(response.stdout, command);
        
        switch (parsedOutput.type) {
          case 'table':
            this.headers.set(parsedOutput.headers || []);
            this.results.set(parsedOutput.data || []);
            break;
          case 'events':
            this.commandOutput.set(parsedOutput.rawOutput || '');
            this.headers.set(parsedOutput.headers || []);
            this.results.set(parsedOutput.data || []);
            this.hasEventsTable.set(true);
            break;
          case 'multiple-pods':
            this.podDescribeData.set(parsedOutput.podData || []);
            break;
          case 'raw':
          default:
            this.commandOutput.set(parsedOutput.rawOutput || '');
            break;
        }
      } else {
        this.commandOutput.set(`Error: ${response.error}\n${response.stderr || ''}`);
      }
    } catch (error) {
      console.error('Command execution failed:', error);
      this.commandOutput.set('Error executing command');
    } finally {
      this.isLoading.set(false);
    }
  }

  onNamespaceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedNamespace.set(target.value);
    this.resourceService.loadResourcesForNamespace(target.value);
  }

  executeTemplate(template: CommandTemplate) {
    const command = this.resourceService.executeTemplate(template, this.selectedNamespace());
    this.customCommand.set(command);
    this.executeCustomCommand();
  }

  onCommandSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target.value) {
      this.customCommand.set(target.value);
    }
  }

  toggleResourceDetails() {
    this.isResourceDetailsExpanded.set(!this.isResourceDetailsExpanded());
  }

  togglePodDetails(podName: string) {
    const expanded = this.expandedPods();
    const newExpanded = new Set(expanded);
    if (newExpanded.has(podName)) {
      newExpanded.delete(podName);
    } else {
      newExpanded.add(podName);
    }
    this.expandedPods.set(newExpanded);
  }

  isPodExpanded(podName: string): boolean {
    return this.expandedPods().has(podName);
  }

  toggleGeneralSection() {
    this.isGeneralExpanded.set(!this.isGeneralExpanded());
  }

  toggleDeploymentSection() {
    this.isDeploymentExpanded.set(!this.isDeploymentExpanded());
  }

  togglePodSection() {
    this.isPodSectionExpanded.set(!this.isPodSectionExpanded());
  }
}