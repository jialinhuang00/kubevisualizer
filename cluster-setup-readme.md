# Kubernetes Test Environment Setup

## Environment Overview

This is a complete local Kubernetes test environment for testing the kubecmds-viz tool. Uses kind (Kubernetes in Docker) to create a multi-node cluster and deploys multiple microservices to simulate real-world scenarios.

## Setup Components

### 1. Kind Cluster
- **Configuration**: `kind-config.yaml`
- **Nodes**: 1 control-plane + 2 workers
- **Name**: kubecmds-test
- **Port Mapping**: 8080 → 80, 8443 → 443

### 2. Namespaces
Created 3 namespaces to simulate different environments:
- `noah` - Primary development environment
- `staging` - Testing environment
- `production` - Production simulation

### 3. Microservice Architecture

#### Joke Service (Deployed)
- **Versions**: v1, v2, v3 (Node.js 18, 20, 22)
- **Features**: 
  - v1: Basic joke API
  - v2: Enhanced jokes + rating
  - v3: Advanced API + statistics
- **Docker Hub**: `jia0/joke-service:v1-v3`
- **Deployment**: noah namespace, 2 replicas

#### Other Services (Prepared)
- `number-service` - Random number generator
- `time-service` - Time service  
- `status-service` - Health checker
- `weather-service` - Mock weather API

## Created Resources

### Pod Status
```bash
kubectl get pods -n noah
# NAME                            READY   STATUS    RESTARTS   AGE
# joke-service-75c5cd6658-tq2k2   0/1     Running   0          19s
# joke-service-75c5cd6658-x72pt   0/1     Running   0          19s
```

### Deployment
```bash
kubectl get deployments -n noah
# NAME           READY   UP-TO-DATE   AVAILABLE   AGE
# joke-service   0/2     2            0           19s
```

### Service
```bash
kubectl get services -n noah
# NAME           TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
# joke-service   ClusterIP   10.96.17.141   <none>        80/TCP    19s
```

## Test Command Collection

### Basic Viewing
```bash
kubectl get pods -n noah
kubectl get deployments -n noah
kubectl get services -n noah
kubectl get namespaces
```

### Detailed Inspection (matches your kubectl commands)
```bash
# View Pod, Deployment, Container and SHA
kubectl get pods -n noah -o 'custom-columns=POD_NAME:.metadata.name,DEPLOYMENT:.metadata.ownerReferences[0].name,CONTAINER_NAME:.spec.containers[*].name,IMAGE:.spec.containers[*].image'

# Check rollout status
kubectl rollout status deployment/joke-service -n noah

# View detailed information
kubectl describe deployment joke-service -n noah
kubectl describe pod -n noah

# View logs
kubectl logs -l app=joke-service -n noah
```

### Rollout Testing
```bash
# Update to v2
kubectl set image deployment/joke-service joke-service=jia0/joke-service:v2 -n noah

# View rollout history
kubectl rollout history deployment/joke-service -n noah

# Rollback
kubectl rollout undo deployment/joke-service -n noah
```

## File Structure

```
kubecmds-viz/
├── kind-config.yaml              # Kind cluster configuration
├── k8s-manifests/               # K8s deployment files
│   └── joke-service-deployment.yaml
├── demo-microservices/          # Demo microservice source code
│   ├── joke-service/
│   │   ├── v1/ (Node.js 18)
│   │   ├── v2/ (Node.js 20)
│   │   └── v3/ (Node.js 22)
│   └── number-service/
│       ├── v1/ (Node.js 18)
│       ├── v2/ (Node.js 20)
│       └── v3/ (Node.js 22)
└── cluster-setup-readme.md      # This file
```

## Docker Hub Images
All images are pushed to `jia0/` namespace:
- `jia0/joke-service:v1` (Node.js 18)
- `jia0/joke-service:v2` (Node.js 20)  
- `jia0/joke-service:v3` (Node.js 22)

## Next Steps
1. Complete other microservice creation and deployment
2. Create cross-namespace deployments
3. Setup testing and rollout scripts
4. Test various kubectl command visualizations

## Environment Cleanup
```bash
# Delete cluster
bash scripts/cleanup.sh

# Or manually:
kind delete cluster --name kubecmds-test

# Clean Docker images
docker rmi jia0/joke-service:v1 jia0/joke-service:v2 jia0/joke-service:v3
```