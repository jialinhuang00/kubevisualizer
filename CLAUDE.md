# kubecmds-viz Project Context

## Architecture
- Angular 18+ standalone components with signals
- Express.js backend for kubectl command execution
- TypeScript with strict compilation
- Tailwind CSS for styling (cyberpunk theme)
- Three template categories: general, deployment-specific, pod-specific

## Current Features
- **Accordion Sidebar**: Collapsible command templates organized by resource type
- **Dynamic Resource Loading**: Auto-loads namespaces, deployments, pods on selection
- **Smart Output Parsing**: Handles tabular data, YAML, JSON, and Kubernetes events
- **Template System**: Placeholder-based commands with `{namespace}` substitution
- **Fixed Layout**: 350px sidebar + scrollable main content area

## File Structure
```
src/app/
├── app.ts          # Main component (NEEDS REFACTORING)
├── app.html        # Template with accordion UI
├── app.scss        # Component styles
└── app.config.ts   # App configuration

scripts/
├── cluster-setup.sh  # Create kind cluster with test services
└── cleanup.sh        # Remove cluster and cleanup Docker

demo-microservices/   # Mock services for testing (v1,v2,v3 versions)
k8s-manifests/        # Kubernetes deployment files
```

## Current State Issues
- **app.ts too complex**: 600+ lines with mixed responsibilities
- **No service separation**: HTTP calls, parsing, state management all in one component
- **Hard to test**: Tightly coupled logic
- **Scalability concerns**: Adding new resource types requires modifying main component

## Planned Refactoring

### 1. Service Layer Separation
```typescript
services/
├── kubectl.service.ts       # HTTP calls to backend
├── template.service.ts      # Template generation and management
├── resource.service.ts      # Namespace/deployment/pod loading
└── output-parser.service.ts # Command output parsing logic
```

### 2. Component Splitting
```typescript
components/
├── command-sidebar/
│   ├── namespace-selector/
│   ├── template-accordion/
│   └── template-card/
├── output-display/
│   ├── table-output/
│   ├── events-display/
│   └── raw-output/
└── command-input/
```

### 3. State Management
- Consider NgRx for complex state
- Or create simple state services with signals
- Separate UI state from data state

### 4. Type Safety Improvements
- Better interfaces for API responses
- Generic types for resource handling
- Stricter typing for template system

## Technical Debt
- Remove hardcoded values (default namespace, etc.)
- Add error handling for failed kubectl commands
- Implement loading states for resource discovery
- Add unit tests for parsing logic

## Next Session Priorities
1. **Extract KubectlService**: Move all HTTP calls and command execution
2. **Extract TemplateService**: Handle template generation and management
3. **Split OutputParserService**: Separate complex parsing logic
4. **Create ResourceService**: Handle namespace/deployment/pod loading
5. **Component splitting**: Break down large template into smaller components
6. **Add proper error boundaries**: Handle kubectl command failures gracefully
7. ngrx

## Development Commands
- `npm run dev` - Start both frontend and backend
- `bash scripts/cluster-setup.sh` - Setup test environment
- `bash scripts/cleanup.sh` - Cleanup test environment

## Known Working Features
- Template execution with namespace substitution
- Accordion UI with collapsible sections  
- Dynamic resource loading per namespace
- Multiple output format parsing (tables, YAML, events)
- Responsive layout that handles long commands