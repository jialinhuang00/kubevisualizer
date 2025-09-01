export interface KubeResource {
  [key: string]: any;
}

export interface PodDescribeData {
  name: string;
  details: string;
  events: KubeResource[];
  headers: string[];
}

export interface CommandTemplate {
  id: string;
  name: string;
  command: string;
}

export interface KubectlResponse {
  success: boolean;
  stdout: string;
  stderr?: string;
  error?: string;
}

export interface ParsedOutput {
  type: 'table' | 'events' | 'multiple-pods' | 'raw';
  data?: KubeResource[];
  headers?: string[];
  rawOutput?: string;
  podData?: PodDescribeData[];
  hasEventsTable?: boolean;
}