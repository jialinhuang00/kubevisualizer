#!/bin/bash

# Kubernetes Test Environment Setup Script
# For kubecmds-viz project testing

set -e  # Exit on any error

echo "🚀 Setting up Kubernetes test environment..."

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Check required tools
print_step "Checking required tools..."

if ! command -v docker &> /dev/null; then
    print_error "Docker not installed. Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker not running. Please start Docker Desktop and retry"
    exit 1
fi

print_success "Docker ready"

if ! command -v kubectl &> /dev/null; then
    print_warning "kubectl not installed, installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install kubectl
    else
        print_error "Please install kubectl manually: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
fi

print_success "kubectl ready"

if ! command -v kind &> /dev/null; then
    print_warning "kind not installed, installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install kind
    else
        print_error "Please install kind manually: https://kind.sigs.k8s.io/docs/user/quick-start/"
        exit 1
    fi
fi

print_success "kind ready"

# 2. Check existing cluster
print_step "Checking existing cluster..."
if kind get clusters | grep -q "kubecmds-test"; then
    print_warning "Found existing kubecmds-test cluster"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Deleting existing cluster..."
        kind delete cluster --name kubecmds-test
        print_success "Cluster deleted"
    else
        print_warning "Using existing cluster"
        kubectl config use-context kind-kubecmds-test
    fi
else
    # 3. Create Kind Cluster
    print_step "Creating kind cluster..."
    kind create cluster --config=kind-config.yaml
    print_success "Cluster created"
fi

# 4. Wait for nodes to be ready
print_step "Waiting for nodes to be ready..."
sleep 10
kubectl wait --for=condition=Ready nodes --all --timeout=300s
print_success "All nodes ready"

# 5. Create Namespaces
print_step "Creating namespaces..."
kubectl create namespace noah --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace staging --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -
print_success "Namespaces created"

# 6. Build microservice Docker Images
print_step "Building microservice Docker images..."

build_service_images() {
    local service_name=$1
    print_step "Building $service_name images..."
    
    for version in v1 v2 v3; do
        if [ -d "demo-microservices/$service_name/$version" ]; then
            print_step "Building $service_name:$version..."
            docker build -t "$service_name:$version" "demo-microservices/$service_name/$version/"
            print_success "$service_name:$version built"
        fi
    done
}

# Build joke-service images
if [ -d "demo-microservices/joke-service" ]; then
    build_service_images "joke-service"
else
    print_warning "joke-service source not found, skipping"
fi

# Build number-service images  
if [ -d "demo-microservices/number-service" ]; then
    build_service_images "number-service"
else
    print_warning "number-service source not found, skipping"
fi

# 7. Push to Docker Hub (optional)
echo
read -p "Push images to Docker Hub? Requires docker login (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your Docker Hub username: " docker_username
    
    if [ -z "$docker_username" ]; then
        print_warning "Skipping Docker Hub push"
    else
        print_step "Pushing images to Docker Hub..."
        
        # Tag and push joke-service
        for version in v1 v2 v3; do
            if docker image inspect "joke-service:$version" &> /dev/null; then
                docker tag "joke-service:$version" "$docker_username/joke-service:$version"
                docker push "$docker_username/joke-service:$version"
                print_success "Pushed $docker_username/joke-service:$version"
            fi
        done
        
        # Tag and push number-service
        for version in v1 v2 v3; do
            if docker image inspect "number-service:$version" &> /dev/null; then
                docker tag "number-service:$version" "$docker_username/number-service:$version"
                docker push "$docker_username/number-service:$version"
                print_success "Pushed $docker_username/number-service:$version"
            fi
        done
        
        # Update image names in deployment YAML
        if [ -d "k8s-manifests" ]; then
            print_step "Updating image names in K8s manifests..."
            find k8s-manifests -name "*.yaml" -exec sed -i.bak "s|image: jia0/|image: $docker_username/|g" {} \;
            print_success "Image names updated"
        fi
    fi
else
    print_warning "Skipping Docker Hub push, using local images"
    # Load local images to kind cluster
    print_step "Loading local images to kind cluster..."
    for version in v1 v2 v3; do
        if docker image inspect "joke-service:$version" &> /dev/null; then
            kind load docker-image "joke-service:$version" --name kubecmds-test
            print_success "Loaded joke-service:$version"
        fi
        if docker image inspect "number-service:$version" &> /dev/null; then
            kind load docker-image "number-service:$version" --name kubecmds-test
            print_success "Loaded number-service:$version"
        fi
    done
fi

# 8. Deploy services
print_step "Deploying services to cluster..."

if [ -d "k8s-manifests" ]; then
    for manifest in k8s-manifests/*.yaml; do
        if [ -f "$manifest" ]; then
            print_step "Deploying $manifest..."
            kubectl apply -f "$manifest"
            print_success "Deployed $(basename $manifest)"
        fi
    done
else
    print_warning "k8s-manifests directory not found, skipping deployment"
fi

# 9. Wait for deployment completion
print_step "Waiting for all pods to be ready..."
sleep 5
kubectl wait --for=condition=Ready pods --all -n noah --timeout=300s 2>/dev/null || true
kubectl wait --for=condition=Ready pods --all -n staging --timeout=300s 2>/dev/null || true
kubectl wait --for=condition=Ready pods --all -n production --timeout=300s 2>/dev/null || true

# 10. Display environment status
echo
echo "🎉 Kubernetes test environment setup complete!"
echo
print_step "Environment status:"
echo "Cluster: $(kubectl config current-context)"
echo "Nodes:"
kubectl get nodes --no-headers | while read node status role age version; do
    echo "  • $node ($status)"
done

echo
echo "Namespaces:"
kubectl get namespaces noah staging production --no-headers | while read name status age; do
    echo "  • $name ($status)"
done

echo
echo "Deployed services:"
for ns in noah staging production; do
    if kubectl get pods -n "$ns" --no-headers 2>/dev/null | head -1 > /dev/null; then
        echo "📦 Namespace: $ns"
        kubectl get pods -n "$ns" --no-headers 2>/dev/null | while read pod ready status restarts age; do
            echo "  • $pod ($status)"
        done
    fi
done

echo
print_step "Sample test commands:"
echo "kubectl get pods -n noah"
echo "kubectl get deployments -n noah"
echo "kubectl get pods -n noah -o wide"
echo "kubectl rollout status deployment/joke-service -n noah"
echo
print_success "Ready to test kubecmds-viz!"
print_step "Frontend: http://localhost:4200"
print_step "Backend: http://localhost:3000"