# Kubernetes 服務訪問完整指南

## 如何找到服務信息

### 1. 基本信息查詢
```bash
# 查看服務列表
kubectl get services -n <namespace>

# 查看服務詳細信息
kubectl describe service <service-name> -n <namespace>

# 查看節點信息
kubectl get nodes -o wide

# 查看 Pod 信息
kubectl get pods -n <namespace> -o wide
```

## 訪問方法總表

### ClusterIP 服務 (如 number-service)

| 訪問方式 | 指令 | IP:Port 來源 |
|---------|------|-------------|
| **Service DNS** | `kubectl exec -it <pod> -n <namespace> -- wget -qO- http://<service-name>:80/` | Service 名稱:Service Port |
| **Service ClusterIP** | `kubectl exec -it <pod> -n <namespace> -- wget -qO- http://10.96.15.216:80/` | `kubectl get svc` 的 CLUSTER-IP |
| **直接 Pod IP** | `kubectl exec -it <pod> -n <namespace> -- wget -qO- http://10.244.x.x:3000/` | `kubectl get pods -o wide` 的 IP:TargetPort |

**❌ 不支援的方式：**
- Docker exec (外部無法路由到 ClusterIP)
- NodePort 訪問 (ClusterIP 沒有 NodePort)

### NodePort 服務 (如 joke-service)

| 訪問方式 | 指令 | IP:Port 來源 |
|---------|------|-------------|
| **Docker Exec (節點內)** | `docker exec -it kubecmds-test-control-plane curl http://localhost:31248/joke` | localhost:NodePort |
| **Service DNS** | `kubectl exec -it <pod> -n <namespace> -- wget -qO- http://<service-name>:80/` | Service 名稱:Service Port |
| **Service ClusterIP** | `kubectl exec -it <pod> -n <namespace> -- wget -qO- http://10.96.96.125:80/` | `kubectl get svc` 的 CLUSTER-IP |
| **NodeIP:NodePort** | `kubectl exec -it <pod> -n <namespace> -- wget -qO- http://172.18.0.4:31248/` | `kubectl get nodes -o wide` 的 INTERNAL-IP:NodePort |
| **直接 Pod IP** | `kubectl exec -it <pod> -n <namespace> -- wget -qO- http://10.244.x.x:3000/` | `kubectl get pods -o wide` 的 IP:TargetPort |

## 實際範例

### 查找服務信息
```bash
# 1. 查看服務
kubectl get services -n noah
# 輸出: joke-service NodePort 10.96.96.125 80:31248/TCP
#      number-service ClusterIP 10.96.15.216 80/TCP

# 2. 查看節點 IP
kubectl get nodes -o wide
# 輸出: kubecmds-test-control-plane 172.18.0.4

# 3. 查看 Pod 信息
kubectl get pods -n noah -o wide
# 輸出: joke-service-xxx 10.244.1.2

# 4. 查看服務詳細信息 (找 TargetPort)
kubectl describe service joke-service -n noah
# 輸出: TargetPort: 3000/TCP
```

### 實際訪問指令

**ClusterIP (number-service):**
```bash
# ✅ 方式 1: Service DNS
kubectl exec -it joke-service-75c5cd6658-4hvtj -n noah -- wget -qO- http://number-service:80/

# ✅ 方式 2: ClusterIP
kubectl exec -it joke-service-75c5cd6658-4hvtj -n noah -- wget -qO- http://10.96.15.216:80/
```

**NodePort (joke-service):**
```bash
# ✅ 方式 1: Docker exec 進入節點
docker exec -it kubecmds-test-control-plane curl http://localhost:31248/joke

# ✅ 方式 2: NodeIP:NodePort
kubectl exec -it joke-service-75c5cd6658-4hvtj -n noah -- wget -qO- http://172.18.0.4:31248/joke

# ✅ 方式 3: Service DNS
kubectl exec -it joke-service-75c5cd6658-4hvtj -n noah -- wget -qO- http://joke-service:80/joke

# ✅ 方式 4: ClusterIP
kubectl exec -it joke-service-75c5cd6658-4hvtj -n noah -- wget -qO- http://10.96.96.125:80/joke
```

## 本地 Kubernetes 工具比較

### 網路模型對比

| 工具 | 架構 | NodePort 訪問方式 | 網路隔離 |
|------|------|------------------|----------|
| **Kind** | Docker 容器 | `docker exec -it <container> curl localhost:NodePort` | ❌ 需要進入容器 |
| **Minikube (Docker)** | Docker 容器 | `minikube service <service> --url` | ❌ 需要專門指令 |
| **Minikube (VM)** | 虛擬機 | `curl http://<vm-ip>:NodePort` | ✅ 但需要 VM IP |
| **k3s** | Host OS 直接安裝 | `curl http://localhost:NodePort` | ✅ 完全無隔離 |
| **k0s** | Host OS 直接安裝 | `curl http://localhost:NodePort` | ✅ 完全無隔離 |

### 什麼是 k0s？

**k0s** 是 Mirantis 開發的輕量級 Kubernetes 發行版：

**特點**：
- **Zero Dependencies**: 單一二進位檔，無外部依賴
- **Zero Friction**: 安裝簡單，一個指令搞定
- **Zero Cost**: 開源免費，商業友好
- **生產就緒**: 符合 CNCF 合規，支持高可用

**安裝超簡單**：
```bash
# 下載並安裝
curl -sSLf https://get.k0s.sh | sudo sh

# 啟動 controller
sudo k0s install controller --single

# 啟動服務
sudo k0s start

# 取得 kubeconfig
sudo k0s kubeconfig admin > ~/.kube/config
```

**k3s vs k0s 比較**：
- **k3s**: Rancher 開發，更知名，內建更多組件
- **k0s**: Mirantis 開發，更模組化，可自選組件

### 最佳本地開發選擇

**如果你想要最簡單的 NodePort 體驗**：
1. **k3s** - 最流行，社群大
2. **k0s** - 最乾淨，模組化

**如果需要 Docker 環境隔離**：
1. **Kind** - CI/CD 友好
2. **Minikube** - 功能最完整

## 記憶口訣

- **ClusterIP**: 只能內部訪問，用 Service 名稱最簡單
- **NodePort**: 多了節點端口，可從外部 (Docker exec) 或內部訪問
- **找 IP**: `kubectl get` 系列指令
- **找 Port**: Service Port (對外) vs TargetPort (Pod 內部)
- **想要簡單 NodePort**: 用 k3s/k0s
- **需要隔離環境**: 用 Kind/Minikube