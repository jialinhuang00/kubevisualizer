import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface KubeResource {
  [key: string]: any;
}

interface PodDescribeData {
  name: string;
  details: string;
  events: KubeResource[];
  headers: string[];
}

interface CommandTemplate {
  id: string;
  name: string;
  command: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private http = inject(HttpClient);
  protected readonly title = signal('kubecmds-viz');

  ngOnInit() {
    this.loadNamespaces();
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
  namespaces = signal<string[]>([]);
  selectedNamespace = signal<string>('noah');
  deployments = signal<string[]>([]);
  pods = signal<string[]>([]);

  // Accordion states
  isGeneralExpanded = signal<boolean>(true);
  isDeploymentExpanded = signal<boolean>(true);
  isPodSectionExpanded = signal<boolean>(true);

  // 一般命令 - 只需要 namespace
  generalTemplates = signal<CommandTemplate[]>([
    // 'check Pod、Deployment、Container and sha'
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
  ]);

  deploymentTemplates = signal<CommandTemplate[]>([]);
  podTemplates = signal<CommandTemplate[]>([]);

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
      await this.simulateCommandExecution(command);
    } catch (error) {
      console.error('Command execution failed:', error);
      this.commandOutput.set('Error executing command');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateCommandExecution(command: string) {
    try {
      const response = await this.http.post<any>('http://localhost:3000/api/execute', {
        command: command
      }).toPromise();

      if (response.success) {
        const output = response.stdout.trim();

        // Try to parse as tabular output first
        if (this.isTabularOutput(output, command)) {
          this.parseTabularOutput(output, command);
        } else if (this.hasEventsTableInOutput(output) && this.isMultiplePodDescribe(output)) {
          this.parseMultiplePodDescribe(output);
        } else if (this.hasEventsTableInOutput(output)) {
          this.parseEventsFromDescribe(output);
        } else {
          // Display as raw output
          this.commandOutput.set(output);
        }
      } else {
        this.commandOutput.set(`Error: ${response.error}\n${response.stderr || ''}`);
      }
    } catch (error) {
      this.commandOutput.set(`Network error: ${error}`);
    }
  }

  private isTabularOutput(output: string, command: string = ''): boolean {
    const lines = output.split('\n').filter(line => line.trim());

    // Skip if too few lines
    if (lines.length < 2) return false;

    // Skip JSON
    if (output.trim().startsWith('{') || output.trim().startsWith('[')) return false;

    // Skip YAML
    if (output.includes('apiVersion:') || output.includes('kind:') ||
      output.includes('metadata:') || output.includes('spec:')) return false;

    // Skip config view output
    if (output.includes('apiVersion: v1') || output.includes('clusters:') ||
      output.includes('contexts:') || output.includes('users:')) return false;

    // Skip other structured outputs
    if (output.includes('---') || lines[0].startsWith('  ')) return false;

    // Check if it looks like a table (header + consistent columns)
    const headerLine = lines[0];
    const headers = headerLine.split(/\s+/);

    // Must have multiple columns
    if (headers.length < 2) return false;

    // Check if subsequent lines have similar column structure
    let tableRowCount = 0;
    for (let i = 1; i < Math.min(lines.length, 5); i++) {
      const columns = lines[i].split(/\s+/);
      if (columns.length >= headers.length - 1) {
        tableRowCount++;
      }
    }

    // If most lines look like table rows, it's probably a table
    return tableRowCount >= Math.min(2, lines.length - 1);
  }

  private parseTabularOutput(output: string, command: string = '') {
    const lines = output.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      this.commandOutput.set(output);
      return;
    }

    // Check if command has --no-headers
    const hasNoHeaders = command.includes('--no-headers');

    let headers: string[];
    let dataLines: string[];

    if (hasNoHeaders) {
      // For --no-headers commands, extract headers from custom-columns
      if (command.includes('custom-columns=')) {
        const customColsMatch = command.match(/custom-columns=['""]([^'""]+)['"]/);
        if (customColsMatch) {
          const customCols = customColsMatch[1];
          headers = customCols.split(',').map(col => {
            const colonIndex = col.indexOf(':');
            return colonIndex > 0 ? col.substring(0, colonIndex).trim() : col.trim();
          });
        } else {
          // Fallback: guess headers from first line structure
          headers = ['COL1', 'COL2', 'COL3', 'COL4', 'COL5'].slice(0, lines[0].split(/\s+/).length);
        }
      } else {
        // Standard kubectl get without custom-columns
        headers = ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']; // Default for pods
      }
      dataLines = lines;
    } else {
      // Normal table with headers
      if (lines.length < 2) {
        this.commandOutput.set(output);
        return;
      }
      headers = lines[0].split(/\s+/);
      dataLines = lines.slice(1);
    }

    this.headers.set(headers);
    const results: KubeResource[] = dataLines.map(line => {
      const values = line.split(/\s+/);
      const resource: KubeResource = {};
      headers.forEach((header, index) => {
        resource[header.toLowerCase()] = values[index] || '';
      });
      return resource;
    });

    this.results.set(results);
  }

  private hasEventsTableInOutput(output: string): boolean {
    return output.includes('Events:') &&
      output.includes('Type') &&
      output.includes('Reason') &&
      output.includes('Age') &&
      output.includes('Message');
  }

  private parseEventsFromDescribe(output: string) {
    const lines = output.split('\n');

    // Find the LAST Events section (in case of multiple pods)
    let lastEventsStartIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === 'Events:') {
        lastEventsStartIndex = i;
        break;
      }
    }

    if (lastEventsStartIndex === -1) {
      this.commandOutput.set(output);
      return;
    }

    // Set the full output (before the LAST Events section) as text
    const beforeLastEvents = lines.slice(0, lastEventsStartIndex).join('\n');
    this.commandOutput.set(beforeLastEvents.trim());

    // Find the header line after the last Events section
    let headerIndex = -1;
    for (let i = lastEventsStartIndex + 1; i < lines.length; i++) {
      if (lines[i].includes('Type') && lines[i].includes('Reason') && lines[i].includes('Age')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      // No proper Events table found, show all as text
      this.commandOutput.set(output);
      return;
    }

    // Skip the separator line (----)
    let dataStartIndex = headerIndex + 2;
    if (dataStartIndex >= lines.length) {
      this.commandOutput.set(output);
      return;
    }

    // Extract headers and data from the last Events section only
    const headers = lines[headerIndex].split(/\s+/).filter(h => h.trim());
    this.headers.set(headers);

    // Get all event lines from the last Events section until end of output or next pod
    const eventLines = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      // Stop if we hit another pod description or empty lines at end
      if (line.trim() === '' || line.startsWith('Name:')) {
        break;
      }
      if (line.trim()) {
        eventLines.push(line);
      }
    }

    const results: KubeResource[] = eventLines.map(line => {
      const parts = line.trim().split(/\s+/);
      const resource: KubeResource = {};

      // Events table has: Type, Reason, Age, From, Message
      // Message can contain spaces, so we need special handling
      if (parts.length >= 5) {
        resource['type'] = parts[0] || '';
        resource['reason'] = parts[1] || '';
        resource['age'] = parts[2] || '';
        resource['from'] = parts[3] || '';
        resource['message'] = parts.slice(4).join(' ') || '';
      } else {
        headers.forEach((header, index) => {
          resource[header.toLowerCase()] = parts[index] || '';
        });
      }

      return resource;
    });

    this.results.set(results);
    this.hasEventsTable.set(true);
  }

  async loadNamespaces() {
    try {
      const response = await this.http.post<any>('http://localhost:3000/api/execute', {
        command: 'kubectl get namespaces -o jsonpath="{.items[*].metadata.name}"'
      }).toPromise();

      if (response.success) {
        const namespaces = response.stdout.trim().split(' ').filter((ns: string) => ns);
        this.namespaces.set(namespaces);
        this.loadResourcesForNamespace(this.selectedNamespace());
      }
    } catch (error) {
      console.error('Failed to load namespaces:', error);
      this.namespaces.set(['default', 'noah', 'staging', 'production']);
    }
  }

  async loadResourcesForNamespace(namespace: string) {
    if (!namespace) return;

    try {
      // 獲取 deployments
      const deployResponse = await this.http.post<any>('http://localhost:3000/api/execute', {
        command: `kubectl get deployments -n ${namespace} -o jsonpath="{.items[*].metadata.name}"`
      }).toPromise();

      if (deployResponse.success) {
        const deployments = deployResponse.stdout.trim().split(' ').filter((d: string) => d);
        this.deployments.set(deployments);
        this.updateDeploymentTemplates(deployments);
      }

      // 獲取 pods  
      const podResponse = await this.http.post<any>('http://localhost:3000/api/execute', {
        command: `kubectl get pods -n ${namespace} -o jsonpath="{.items[*].metadata.name}"`
      }).toPromise();

      if (podResponse.success) {
        const pods = podResponse.stdout.trim().split(' ').filter((p: string) => p);
        this.pods.set(pods);
        this.updatePodTemplates(pods);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
      this.deployments.set([]);
      this.pods.set([]);
      this.deploymentTemplates.set([]);
      this.podTemplates.set([]);
    }
  }

  updateDeploymentTemplates(deployments: string[]) {
    if (deployments.length === 0) {
      this.deploymentTemplates.set([]);
      return;
    }

    const templates: CommandTemplate[] = deployments.flatMap(dep => [
      {
        id: `deploy-${dep}-status`,
        name: `${dep} Rollout Status`,
        command: `kubectl rollout status deployment/${dep} -n {namespace}`,
      },
      // description: `check ${dep} rollout history`
      {
        id: `deploy-${dep}-history`,
        name: `${dep} History`,
        command: `kubectl rollout history deployment/${dep} -n {namespace}`,
      },
      // description: `${dep} details`
      {
        id: `deploy-${dep}-describe`,
        name: `${dep} Details`,
        command: `kubectl describe deployment ${dep} -n {namespace}`,
      },
      // description: `rollback ${dep} to last version`
      {
        id: `deploy-${dep}-rollback`,
        name: `${dep} Rollback`,
        command: `kubectl rollout undo deployment/${dep} -n {namespace}`,
      }
    ]);
    this.deploymentTemplates.set(templates);
  }

  updatePodTemplates(pods: string[]) {
    if (pods.length === 0) {
      this.podTemplates.set([]);
      return;
    }

    const templates: CommandTemplate[] = pods.flatMap(pod => [
      {
        id: `pod-${pod}-logs`,
        name: `${pod} Logs`,
        command: `kubectl logs ${pod} -n {namespace} --tail=50`,
      },
      // description: `${pod} details`
      {
        id: `pod-${pod}-describe`,
        name: `${pod} Details`,
        command: `kubectl describe pod ${pod} -n {namespace}`,
      },
      // description: `exec` ?? //TODO how
      {
        id: `pod-${pod}-exec`,
        name: `${pod} Exec`,
        command: `kubectl exec -it ${pod} -n {namespace} -- /bin/sh`,
      }
    ]);
    this.podTemplates.set(templates);
  }

  onNamespaceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedNamespace.set(target.value);
    this.loadResourcesForNamespace(target.value);
  }

  executeTemplate(template: CommandTemplate) {
    const command = template.command.replace(/{namespace}/g, this.selectedNamespace());
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

  private isMultiplePodDescribe(output: string): boolean {
    const nameMatches = output.match(/^Name:\s+/gm);
    return nameMatches !== null && nameMatches.length > 1;
  }

  private parseMultiplePodDescribe(output: string) {
    const lines = output.split('\n');
    const podData: PodDescribeData[] = [];

    // Find all Name: lines to identify pod boundaries
    const podStartIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Name:')) {
        podStartIndices.push(i);
      }
    }

    // Process each pod
    for (let podIndex = 0; podIndex < podStartIndices.length; podIndex++) {
      const startIndex = podStartIndices[podIndex];
      const endIndex = podIndex < podStartIndices.length - 1 ? podStartIndices[podIndex + 1] : lines.length;
      const podLines = lines.slice(startIndex, endIndex);

      // Extract pod name
      const podName = podLines[0].replace('Name:', '').trim();

      // Find Events section for this pod
      let eventsStartIndex = -1;
      for (let i = 0; i < podLines.length; i++) {
        if (podLines[i].trim() === 'Events:') {
          eventsStartIndex = i;
          break;
        }
      }

      let podDetails = '';
      let events: KubeResource[] = [];
      let headers: string[] = ['Type', 'Reason', 'Age', 'From', 'Message']; // Default headers

      if (eventsStartIndex !== -1) {
        // Split pod into details and events
        podDetails = podLines.slice(0, eventsStartIndex).join('\n').trim();

        // Parse events - look for header line
        let headerIndex = -1;
        for (let i = eventsStartIndex + 1; i < podLines.length; i++) {
          if (podLines[i].includes('Type') && podLines[i].includes('Reason') && podLines[i].includes('Age')) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          headers = podLines[headerIndex].split(/\s+/).filter((h: string) => h.trim());

          // Find data start (skip separator line ----)
          let dataStartIndex = headerIndex + 1;
          while (dataStartIndex < podLines.length && podLines[dataStartIndex].includes('----')) {
            dataStartIndex++;
          }

          // Collect all event lines from this pod
          for (let i = dataStartIndex; i < podLines.length; i++) {
            const line = podLines[i];
            if (!line.trim()) continue; // Skip empty lines

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) { // Valid event line
              const resource: KubeResource = {};
              resource['type'] = parts[0] || '';
              resource['reason'] = parts[1] || '';
              resource['age'] = parts[2] || '';
              resource['from'] = parts[3] || '';
              resource['message'] = parts.slice(4).join(' ') || '';
              events.push(resource);
            }
          }
        }
      } else {
        // No events section, just details
        podDetails = podLines.join('\n').trim();
      }

      console.log(`Pod ${podName}:`, {
        eventsStartIndex,
        podLinesLength: podLines.length,
        eventsCount: events.length,
        detailsIncludesEvents: podDetails.includes('Events:')
      });

      podData.push({
        name: podName,
        details: podDetails,
        events: events,
        headers: headers
      });
    }

    this.podDescribeData.set(podData);
  }
}