import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface KubeResource {
  [key: string]: any;
}

interface CommandTemplate {
  id: string;
  name: string;
  command: string;
  description: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private http = inject(HttpClient);
  protected readonly title = signal('kubecmds-viz');
  
  customCommand = signal<string>('kubectl get pods -n default -o wide');
  results = signal<KubeResource[]>([]);
  isLoading = signal<boolean>(false);
  commandOutput = signal<string>('');
  headers = signal<string[]>([]);
  
  commandTemplates = signal<CommandTemplate[]>([
    {
      id: '1',
      name: 'Client Version JSON',
      command: 'kubectl version --client -o json',
      description: 'JSON格式的客戶端版本'
    },
    {
      id: '2', 
      name: 'Client Version Short',
      command: 'kubectl version --client --short',
      description: '簡短的客戶端版本'
    },
    {
      id: '3',
      name: 'Config View',
      command: 'kubectl config view',
      description: '查看配置'
    },
    {
      id: '4',
      name: 'Get Contexts',
      command: 'kubectl config get-contexts',
      description: '列出可用contexts'
    },
    {
      id: '5',
      name: 'Current Context',
      command: 'kubectl config current-context',
      description: '顯示當前context'
    },
    {
      id: '6',
      name: 'Config Minify',
      command: 'kubectl config view --minify',
      description: '最小化配置（無機密）'
    },
    {
      id: '7',
      name: 'API Resources',
      command: 'kubectl api-resources',
      description: '列出可用API資源'
    },
    {
      id: '8',
      name: 'API Versions',
      command: 'kubectl api-versions',
      description: '列出支援的API版本'
    },
    {
      id: '9',
      name: 'Help',
      command: 'kubectl --help',
      description: '顯示幫助'
    },
    {
      id: '10',
      name: 'Explain Pods',
      command: 'kubectl explain pods',
      description: 'Pod資源說明文檔'
    }
  ]);
  
  onCustomCommandChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.customCommand.set(target.value);
  }
  
  async executeCustomCommand() {
    const command = this.customCommand();
    if (!command.trim()) return;
    
    this.isLoading.set(true);
    this.commandOutput.set('');
    this.results.set([]);
    
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
        if (this.isTabularOutput(output)) {
          this.parseTabularOutput(output);
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
  
  private isTabularOutput(output: string): boolean {
    const lines = output.split('\n');
    return lines.length >= 2 && 
           lines[0].includes(' ') && 
           !output.startsWith('{') && 
           !output.startsWith('[');
  }
  
  private parseTabularOutput(output: string) {
    const lines = output.trim().split('\n');
    if (lines.length < 2) {
      this.commandOutput.set(output);
      return;
    }
    
    const headerLine = lines[0];
    const headers = headerLine.split(/\s+/);
    this.headers.set(headers);
    
    const dataLines = lines.slice(1);
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
  
  onCommandSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target.value) {
      this.customCommand.set(target.value);
    }
  }
}