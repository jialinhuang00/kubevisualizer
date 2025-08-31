#!/bin/bash

# Kubernetes Test Environment Cleanup Script
# For kubecmds-viz project

set -e

echo "🧹 Starting Kubernetes test environment cleanup..."

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

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    print_error "kind not installed, cannot cleanup"
    exit 1
fi

# Check if kubecmds-test cluster exists
print_step "Checking existing cluster..."
if kind get clusters | grep -q "kubecmds-test"; then
    print_warning "Found kubecmds-test cluster"
    
    # Display current cluster status
    echo
    print_step "Current cluster status:"
    echo "Context: $(kubectl config current-context 2>/dev/null || echo 'N/A')"
    
    if kubectl get nodes --no-headers 2>/dev/null; then
        echo "Nodes:"
        kubectl get nodes --no-headers 2>/dev/null | while read node status role age version; do
            echo "  • $node ($status)"
        done
        
        echo
        echo "Running pods:"
        for ns in noah staging production default; do
            if kubectl get pods -n "$ns" --no-headers 2>/dev/null | head -1 > /dev/null 2>&1; then
                echo "📦 Namespace: $ns"
                kubectl get pods -n "$ns" --no-headers 2>/dev/null | while read pod ready status restarts age; do
                    echo "  • $pod ($status)"
                done
            fi
        done
    fi
    
    echo
    read -p "Confirm deletion of kubecmds-test cluster? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Deleting kind cluster..."
        kind delete cluster --name kubecmds-test
        print_success "Cluster deleted"
        
        # Clean related Docker images (optional)
        echo
        read -p "Clean related Docker images? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_step "Cleaning Docker images..."
            
            # Clean kind node image
            if docker images | grep -q "kindest/node"; then
                docker images "kindest/node" --format "table {{.Repository}}:{{.Tag}}" | tail -n +2 | xargs -r docker rmi 2>/dev/null || true
                print_success "Cleaned kind node images"
            fi
            
            # Clean custom service images
            for service in joke-service number-service; do
                for version in v1 v2 v3; do
                    if docker images | grep -q "$service.*$version"; then
                        docker rmi "$service:$version" 2>/dev/null || true
                        print_success "Cleaned $service:$version"
                    fi
                done
            done
            
            # Clean dangling images
            if docker images -f "dangling=true" -q | head -1 > /dev/null 2>&1; then
                docker image prune -f
                print_success "Cleaned dangling images"
            fi
        else
            print_warning "Keeping Docker images"
        fi
        
        echo
        print_success "🎉 Cleanup complete!"
        echo
        print_step "To recreate test environment, run:"
        echo "bash scripts/cluster-setup.sh"
        
    else
        print_warning "Cleanup cancelled"
    fi
else
    print_warning "No kubecmds-test cluster found, nothing to cleanup"
    
    # Check for leftover Docker containers
    if docker ps -a | grep -q "kubecmds-test"; then
        print_warning "Found leftover Docker containers"
        docker ps -a | grep "kubecmds-test"
        echo
        read -p "Clean these containers? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker ps -a | grep "kubecmds-test" | awk '{print $1}' | xargs -r docker rm -f
            print_success "Cleaned leftover containers"
        fi
    fi
fi

echo
print_step "Current Docker status:"
echo "Running containers: $(docker ps -q | wc -l | tr -d ' ')"
echo "Total images: $(docker images -q | wc -l | tr -d ' ')"