# CloudFront to EKS 完整流量追蹤指南

## 🎯 概述

這份文檔記錄了從 CloudFront 到 EKS 內部服務的完整流量路徑追蹤過程，包含兩個視角：
1. **外到內**：從 CloudFront 行為追蹤到 K8s 服務
2. **內到外**：從 EKs 服務創建到 AWS 基礎設施

---

## 📍 實際案例架構

```
用戶請求: dev.domain.com/remix-portal/feature
    ↓
CloudFront (Behavior: /remix-portal/*)
    ↓
VPC Origin: dev-remix.mammothcyber.io
    ↓
Route53 DNS 解析
    ↓
NLB: a092cd9c...elb.us-east-1.amazonaws.com
    ↓
Target Groups: Pod IPs (IP target mode)  ← 直接路由到 Pod
    ↓
Service: ztunnel-external-istio (istio-ingress namespace)
    ↓
Istio Gateway/VirtualService 路由規則
    ↓
Backend Service: remix (intra namespace)
    ↓
Pod: remix-6dfdb6477b-6dlsc
```

---

## 🔍 外到內：CloudFront 流量追蹤步驟

### 1. CloudFront Behavior 分析
```bash
# 在 AWS Console 查看
CloudFront → Distribution → Behaviors

發現：
- Path pattern: /remix-portal/*
- Origin: vpc-origin-istio  
- Origin domain: dev-remix.mammothcyber.io
```

### 2. DNS 解析追蹤
```bash
# 查看 Route53 記錄
aws route53 list-resource-record-sets --hosted-zone-id <zone-id>

# 或用命令行工具
dig dev-remix.mammothcyber.io
nslookup dev-remix.mammothcyber.io

結果：指向 NLB DNS name
```

### 3. AWS Load Balancer 分析
```bash
# 查找對應的 NLB
aws elbv2 describe-load-balancers --query 'LoadBalancers[?DNSName==`a092cd9c...elb.us-east-1.amazonaws.com`]'

# 查看 Target Groups
aws elbv2 describe-target-groups --load-balancer-arn <nlb-arn>

# 查看 Targets (EKS Nodes)
aws elbv2 describe-target-health --target-group-arn <tg-arn>
```

### 4. Kubernetes 資源追蹤
```bash
# 找到對應的 LoadBalancer Service
kubectl get services --all-namespaces | grep LoadBalancer

# 檢查 Ingress/Gateway 規則
kubectl get gateway -A
kubectl get virtualservice -A

# 追蹤到最終服務
kubectl get service remix -n intra
kubectl get endpoints remix -n intra
```

---

## 🏗️ 內到外：EKS 到 AWS 基礎設施創建

### 1. K8s Service 創建
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ztunnel-external-istio
  namespace: istio-ingress
spec:
  type: LoadBalancer  # ← 觸發 AWS 資源創建
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30544
```

### 2. AWS Load Balancer Controller 自動反應
```bash
# Controller 運行在 EKS 內部
kubectl get pods -n kube-system | grep aws-load-balancer

工作流程：
1. 監聽 K8s API，發現 type: LoadBalancer
2. 呼叫 AWS API 創建 NLB
3. 根據 target-type annotation 設定 Target Groups：
   - target-type: ip → 直接指向 Pod IPs
   - target-type: instance → 指向 EKS Nodes (使用 NodePort)
4. 回寫 External-IP 到 Service
```

### 3. 手動配置外部資源
```bash
# Route53 記錄指向 NLB
# CloudFront Origin 指向 Route53 域名
```

---

## 👥 架構中的角色與責任

### AWS 層級
| 角色 | 責任 | 位置 |
|------|------|------|
| **CloudFront** | CDN、快取、路由分發 | AWS 全球邊緣節點 |
| **Route53** | DNS 解析 | AWS DNS 服務 |
| **NLB** | Layer 4 負載均衡 | AWS VPC |
| **AWS Load Balancer Controller** | 自動管理 AWS LB 資源 | EKS 內部 Pod |

### Kubernetes 層級
| 角色 | 責任 | 位置 |
|------|------|------|
| **Ingress Resource** | 路由規則定義 | K8s 配置 |
| **Ingress Controller Service** | 實際處理外部流量 | EKS Pods |
| **Gateway/VirtualService** | Istio 路由邏輯 | Istio 配置 |
| **Backend Service** | 內部服務代理 | EKS 內部 |
| **Pods** | 實際應用程序 | EKS Worker Nodes |

---

## 🔌 Port 配置詳解

### Service Port 配置
```yaml
ports:
- port: 80          # Service 內部 port (其他 K8s 服務訪問)
  targetPort: 8080  # Pod 實際監聽 port
  nodePort: 30544   # EKS Node 暴露 port (外部可訪問)
```

### Port 可見性
| Port 類型 | 外部可見 | 用途 | 訪問方式 |
|-----------|----------|------|----------|
| **targetPort (8080)** | ❌ | Pod 內部 | 只有 K8s 內部可訪問 |
| **port (80)** | ❌ | Service 內部 | 其他 K8s 服務通過 Service DNS |
| **nodePort (30544)** | ✅ | Node 對外 | 外部通過 NodeIP:30544 |

### 實際流量路徑

**🎯 當前環境使用 IP Target Mode：**
```
NLB:80 → Pod IP:80 (直接路由，跳過 NodePort)
```

**🔄 傳統 Instance Target Mode：**
```
NLB:80 → EKS Node:30544 → Service:80 → Pod:8080
```

---

## 🔄 Service Type 比較

### ClusterIP vs LoadBalancer vs NodePort

| Service Type | 外部訪問 | 用途 | IP 分配 |
|--------------|----------|------|---------|
| **ClusterIP** | ❌ | 內部服務通信 | 172.20.x.x (集群內部 IP) |
| **NodePort** | ✅ | 測試/簡單暴露 | Node IP + 高端口 (30000-32767) |
| **LoadBalancer** | ✅ | 生產環境 | 外部 IP (雲端提供商分配) |

### ClusterIP 範例
```bash
# remix service (內部服務)
kubectl get service remix -n intra
# OUTPUT: ClusterIP   172.20.194.191   <none>   3004/TCP

# 只能在集群內訪問：
kubectl exec -it some-pod -- curl http://172.20.194.191:3004
```

---

## 🎮 EKS 類型判斷

### 從你的環境特徵判斷：

**✅ 這是真實的 AWS EKS**
- LoadBalancer 服務創建真實的 AWS NLB
- 使用 `aws-load-balancer-controller`
- Target Groups 指向 EC2 instances
- 388天運行時間（生產環境）
- 多個 namespace 和複雜的 Istio 配置

**❌ 不是 minikube**
- minikube 是本地開發環境
- 不會創建真實的 AWS 資源
- LoadBalancer 服務會停留在 `<pending>` 狀態

### EKS 部署特徵
```bash
# EKS 特有的系統組件
kubectl get pods -n kube-system | grep aws
# aws-load-balancer-controller, aws-node, ebs-csi-controller

# Worker nodes 是 EC2 instances
kubectl get nodes -o wide
# 會顯示 EC2 internal IP addresses
```

---

## 🛠️ Debug 命令備忘錄

### CloudFront 分析
```bash
aws cloudfront get-distribution --id <id> | jq '.Distribution.DistributionConfig.Origins'
```

### DNS 追蹤
```bash
dig <domain-name>
nslookup <domain-name>
```

### AWS Load Balancer
```bash
aws elbv2 describe-load-balancers
aws elbv2 describe-target-groups --load-balancer-arn <arn>
aws elbv2 describe-target-health --target-group-arn <arn>
```

### Kubernetes 資源
```bash
# 概覽
kubectl get all -A
kubectl get services --all-namespaces | grep LoadBalancer

# Istio 相關
kubectl get gateway -A
kubectl get virtualservice -A
kubectl get pods -n istio-system

# 特定服務
kubectl describe service <name> -n <namespace>
kubectl get endpoints <name> -n <namespace>
```

---

## 🎯 AWS Load Balancer Target Type 詳解

### IP Target Mode vs Instance Target Mode

| 特性 | IP Target Mode | Instance Target Mode |
|------|----------------|---------------------|
| **Target Groups 指向** | Pod IPs 直接 | EC2 instances (Worker Nodes) |
| **流量路徑** | NLB → Pod IP:targetPort | NLB → Node:nodePort → Service → Pod |
| **性能** | ✅ 更高效，直接路由 | ❌ 多一層 NodePort 轉發 |
| **使用場景** | 現代 EKS 推薦 | 傳統模式 |
| **設定方式** | `target-type: ip` annotation | `target-type: instance` 或預設 |

### 🎯 實際環境：混合模式發現

**經過實際檢查，當前環境使用混合模式：**

```bash
# ztunnel-external Target Groups 分析
Port 80:   Target Type: ip       (HTTP 流量，直接路由)
Port 443:  Target Type: instance (HTTPS 流量，使用 NodePort)  
Port 15021: Target Type: instance (狀態檢查，使用 NodePort)
```

### 實際環境配置檢視

```bash
# 檢查 Service 的 target-type 設定
kubectl get service ztunnel-external-istio -n istio-ingress -o yaml | grep target-type

# 輸出：
# service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
```

### Port 配置完整解析

**🎯 當前環境的實際 Port 配置故事：**

```yaml
# 故事 1：狀態檢查端口 (Instance Mode)
- name: status-port
  nodePort: 32287    # ✅ 實際使用：NLB → EC2:32287 → Pod:15021
  port: 15021        # Service 內部端口
  targetPort: 15021  # Pod 監聽端口

# 故事 2：HTTP 流量 (IP Mode) 
- name: http
  nodePort: 30544    # ❌ 定義但不使用 (IP 直接路由)
  port: 80           # NLB:80 直接到 Pod:80
  targetPort: 80     # Pod 監聽 80 端口

# 故事 3：HTTPS 流量 (Instance Mode)
- name: https  
  nodePort: 31443    # ✅ 實際使用：NLB → EC2:31443 → Pod:443
  port: 443          # Service 內部端口
  targetPort: 443    # Pod 監聽 443 端口
```

### 混合模式的流量路徑

**HTTP 流量 (高效直達):**
```
CloudFront → NLB:80 → Pod IP:10.100.96.115:80 (直接)
```

**HTTPS 流量 (跨節點路由):**
```
CloudFront → NLB:443 → Instance A:31443 → kube-proxy → Instance D Pod:443
```

**狀態檢查:**
```
Health Check → Instance B:32287 → kube-proxy → Instance D Pod:15021
```

### 🔄 跨節點轉發機制

**實際例子：Pod 在 ip-10-100-102-232 節點上 (IP: 10.100.96.115)**

```
Case 1: 流量到達同一節點
┌── ip-10-100-102-232 ──┐
│ NLB → :31443          │
│ kube-proxy            │──┐
│ ztunnel Pod:443       │←─┘ (本地轉發)
│ 10.100.96.115         │
└──────────────────────┘

Case 2: 流量到達不同節點  
┌── ip-10-100-101-xxx ──┐    ┌── ip-10-100-102-232 ──┐
│ NLB → :31443          │    │                       │
│ kube-proxy            │────→ ztunnel Pod:443       │
│ iptables 規則          │    │ 10.100.96.115         │
└──────────────────────┘    └──────────────────────┘
```

**關鍵理解：Instance A 接收的流量可以轉發到 Instance D 的 Pod**

---

## 💡 關鍵理解要點

### 1. Ingress vs Service 差異
- **Service**: 服務代理，負責流量轉發到 Pods
- **Ingress**: 路由規則，定義流量如何進入集群
- **Ingress Controller**: 實際執行 Ingress 規則的程序

### 2. 自動化機制
- AWS Load Balancer Controller 監聽 K8s API
- `type: LoadBalancer` 觸發 AWS 資源創建
- Target Groups 根據 target-type annotation 自動配置：
  - `ip`: 直接指向 Pod IPs (現代推薦)
  - `instance`: 指向 EKS Worker Nodes (傳統模式)

### 3. 流量層級
- **Layer 4 (NLB)**: IP + Port 路由
- **Layer 7 (Istio)**: HTTP Header/Path 路由

### 4. NodePort 在不同模式下的角色
- **IP Target Mode**: NodePort 會分配但不使用，流量直接到 Pod
- **Instance Target Mode**: NodePort 是實際的流量入口，每個 Node 都監聽此端口

### 5. 為什麼看到 "Target Groups 指向 EC2 instances"
- **真實原因**：環境使用混合模式，部分端口確實指向 EC2 instances
- **Port 80 (HTTP)**：使用 IP target，直接到 Pod
- **Port 443 (HTTPS) 和 15021 (Status)**：使用 instance target，通過 NodePort

### 6. 只有 Service 物件需要定義 Port 配置
- **Service**: 需要 `port`, `targetPort`, `nodePort` (LoadBalancer 類型)
- **Pod**: 只需要 `containerPort` 
- **Deployment**: 不需要，透過 Pod template 定義
- 其他 K8s 物件都不需要定義這些 port 配置

### 7. 混合模式的優勢
- **HTTP**: 使用 IP 模式獲得最佳性能 (直接路由)
- **HTTPS**: 使用 instance 模式可能為了 SSL 終止或安全考量
- **狀態檢查**: 使用 instance 模式便於 Health Check

這個架構展現了現代雲原生應用的典型模式：雲服務整合 + 容器編排 + 服務網格 + 混合路由策略！

### 8. Service 是虛擬抽象層
- **Service 不存在於具體 Instance 內部**
- **每個 Node 上的 kube-proxy 實現 Service 規則**
- **iptables 規則負責實際的流量轉發**
- **跨節點轉發**：流量可以在 Instance A 接收，轉發到 Instance D 的 Pod

### 9. NodePort 的工作機制
- **每個 Node 都開放所有定義的 NodePorts**
- **NLB 隨機選擇一個 Node 接收流量**
- **接收 Node 的 kube-proxy 查看 Service endpoints**
- **如果 Pod 在其他 Node，會跨節點轉發**

### 10. Debug 經驗總結
- **不要假設**：即使看到 `target-type: ip` annotation，也要實際檢查 Target Groups
- **混合是常態**：生產環境經常針對不同端口使用不同路由策略
- **NodePort 的真相**：定義了不代表會使用，要看實際的 Target Type
- **Service 是抽象**：不是程序，是通過每個 Node 的 kube-proxy 實現的規則
- **跨節點正常**：流量接收節點和 Pod 所在節點可以不同