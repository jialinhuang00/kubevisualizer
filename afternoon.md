# Afternoon Development Plan - 2025-09-06

## 1. Rollout 控制台實作計劃

### 1.1 架構設計
- **位置**：放在 Deployment 區塊下方，作為子功能
- **概念**：版本播放器 ⏮️ ⏸️ ▶️ ⏭️
- **範圍**：每個 Deployment 有獨立的 rollout 控制台

### 1.2 功能規劃
```typescript
interface RolloutControls {
  // 版本管理
  history: () => RolloutHistory[];      // 查看所有版本
  status: () => RolloutStatus;          // 當前狀態
  
  // 播放器操作
  setImage: (image: string) => void;    // ⏭️ 升級到新版本
  undo: (revision?: number) => void;    // ⏮️ 回滾版本
  pause: () => void;                    // ⏸️ 暫停 rollout
  resume: () => void;                   // ▶️ 恢復 rollout
  restart: () => void;                  // 🔄 重啟部署
}
```

### 1.3 UI 設計
```
📁 Deployments
  └── 📄 joke-service
      ├── 基本操作 (describe, yaml, logs, etc.)
      └── 🎬 Rollout 控制台
          ├── 📊 版本歷史表格 (revision, image, status, created)
          ├── 🎮 播放器控制條
          │   ├── ⏮️ 回滾到 v1    ⏸️ 暫停    ▶️ 恢復    ⏭️ 升級版本
          └── 📈 當前狀態顯示
```

## 3. Template Service 擴展

### 3.1 新增 Rollout Templates
```typescript
generateRolloutTemplates(deploymentName: string): CommandTemplate[] {
  return [
    { name: 'History', command: `kubectl rollout history deployment/${deploymentName} -n {namespace}` },
    { name: 'Status', command: `kubectl rollout status deployment/${deploymentName} -n {namespace}` },
    { name: 'Undo Last', command: `kubectl rollout undo deployment/${deploymentName} -n {namespace}` },
    { name: 'Pause', command: `kubectl rollout pause deployment/${deploymentName} -n {namespace}` },
    { name: 'Resume', command: `kubectl rollout resume deployment/${deploymentName} -n {namespace}` },
    { name: 'Restart', command: `kubectl rollout restart deployment/${deploymentName} -n {namespace}` },
    { name: 'Set Image (v2)', command: `kubectl set image deployment/${deploymentName} ${deploymentName}=jia0/${deploymentName}:v2 -n {namespace}` },
    { name: 'Set Image (v3)', command: `kubectl set image deployment/${deploymentName} ${deploymentName}=jia0/${deploymentName}:v3 -n {namespace}` }
  ];
}
```

## 4. 實作優先順序

### Phase 1: 輸出格式修復 (30 min)
1. 修復 Events 表格的 `LAST SEEN` 欄位問題
2. 實作 `multiple-yamls` 輸出類型
3. 新增 YAML 分離邏輯

### Phase 2: Rollout Templates (45 min)  
1. 在 `TemplateService` 新增 `generateRolloutTemplates()`
2. 在 Deployment HTML 中新增 Rollout 區塊
3. 實作基本的 rollout 操作指令

### Phase 3: 版本播放器 UI (60 min)
1. 設計 rollout 控制台的 HTML/CSS
2. 實作版本歷史表格顯示
3. 新增播放器按鈕互動功能

### Phase 4: 進階功能 (Optional)
1. 實時 rollout 狀態更新
2. 版本比較功能
3. 一鍵回滾到任意版本

## 5. 技術考量

### 5.1 狀態管理
- Rollout 狀態需要定期更新
- 考慮用 `timer()` 或 `interval()` 輪詢狀態

### 5.2 用戶體驗
- 危險操作需要確認對話框 (回滾、重啟)
- 版本切換時顯示進度指示
- 失敗操作的錯誤提示

### 5.3 安全性
- 限制可操作的 image registry (只允許 jia0/*)
- 紀錄所有 rollout 操作的日誌

---

## 🚀 ResourceService 重構完成 (已完成)

### 📁 新的資料夾架構
```
src/app/features/
├── k8s/                        # Kubernetes 資源層
│   ├── services/
│   │   ├── namespace.service.ts    # 命名空間管理
│   │   ├── deployment.service.ts   # 部署 + rollout 監控
│   │   ├── pod.service.ts          # Pod + 日誌串流
│   │   └── svc.service.ts          # Service + endpoints
│   └── models/
└── dashboard/                  # UI 層
    ├── components/
    │   ├── dashboard.component.*   # 主儀表板
    │   └── yaml-display/          # YAML 顯示組件
    └── services/
        ├── template.service.ts     # 命令模板生成
        └── output-parser.service.ts # 輸出解析
```

### 🔄 控制關係和溝通方式

#### 誰控制誰：
1. **Dashboard Component** (控制者) → **K8s Services** (被控制者)
2. **K8s Services** → **KubectlService** (執行層)
3. **TemplateService** → 為各 K8s Services 提供命令模板

#### 溝通方式：
- **Signals** 用於狀態管理和響應式更新
- **Async/Await** 用於 kubectl 命令執行
- **Effect** 用於跨服務的反應式邏輯

### 🚀 新功能支持

**DeploymentService 特色功能：**
- ✅ **Rollout 監控**：實時監聽部署進度
- ✅ **Rollout 控制**：pause/resume/restart/undo
- ✅ **狀態追蹤**：replica 數量、進度百分比

**PodService 特色功能：**
- ✅ **日誌串流**：實時查看 Pod logs
- ✅ **容器執行**：在容器內執行命令
- ✅ **Port Forward**：本地端口轉發

**SvcService 特色功能：**
- ✅ **端點監控**：查看 Service endpoints 狀態
- ✅ **連線測試**：測試 Service 連通性
- ✅ **Port Forward**：Service 級別的端口轉發

### 📋 使用新架構的例子

```typescript
// Dashboard component 中的用法示例
export class DashboardComponent {
  private namespaceService = inject(NamespaceService);
  private deploymentService = inject(DeploymentService);
  private podService = inject(PodService);
  private svcService = inject(SvcService);

  async ngOnInit() {
    // 初始化命名空間
    await this.namespaceService.loadNamespaces();
    
    // 監聽 namespace 變化，載入各資源
    effect(() => {
      const ns = this.namespaceService.currentNamespace();
      if (ns) {
        this.deploymentService.loadDeployments(ns);
        this.podService.loadPods(ns);  
        this.svcService.loadServices(ns);
      }
    });
  }

  // 獨立的 rollout 監控
  startDeploymentRollout(deployment: string) {
    const ns = this.namespaceService.currentNamespace();
    this.deploymentService.startRolloutMonitoring(deployment, ns);
  }

  // 獨立的 log 串流
  streamPodLogs(pod: string) {
    const ns = this.namespaceService.currentNamespace();
    this.podService.startLogStreaming(pod, ns);
  }
}
```

### 🎯 核心優勢

1. **職責分離**：k8s/ 專門處理 Kubernetes 邏輯，dashboard/ 專門處理 UI
2. **獨立監控**：每個資源服務可以獨立監聽變化和狀態
3. **可擴展性**：要加新資源只需在 k8s/services/ 加新服務
4. **清晰架構**：不再有混淆，每個服務職責明確

**這樣的架構完美支持 rollout 播放功能的實作！** 🚀

---

## 📋 Dashboard 組件拆分計劃 (下一步)

### 🚨 現況問題
- **dashboard.component.html**: 685 行 - 太龐大
- **dashboard.component.ts**: 305 行 - 職責過多  
- **模板複雜度高**: 多種輸出格式混雜在一個檔案
- **維護困難**: 修改任一功能都要動到巨大檔案

### 🎯 拆分目標
將 Dashboard 拆分成多個專門的子組件，每個組件負責特定功能。

### 📁 建議的組件結構

```
src/app/features/dashboard/components/
├── dashboard.component.*               # 主容器組件 (簡化後)
├── sidebar/
│   ├── command-sidebar.component.*    # 命令側邊欄主容器
│   ├── namespace-selector.component.* # 命名空間選擇器
│   ├── resource-section.component.*   # 資源區塊 (通用)
│   └── template-list.component.*      # 命令模板列表
├── command-input/
│   └── command-input.component.*      # 命令輸入區
└── output-display/
    ├── output-container.component.*   # 輸出顯示主容器
    ├── table-output.component.*       # 表格輸出顯示
    ├── multiple-tables.component.*    # 多表格顯示
    ├── multiple-yamls.component.*     # 多 YAML 顯示
    ├── pod-describe.component.*       # Pod describe 輸出
    ├── raw-output.component.*         # 原始文字輸出
    └── yaml-display/                  # 已存在的 YAML 顯示組件
```

### 🔧 拆分階段規劃

#### **Phase 1: 側邊欄拆分 (60 min)**

1. **創建 CommandSidebarComponent** (主容器)
   ```typescript
   // 管理整個側邊欄的狀態和布局
   @Component({
     selector: 'app-command-sidebar',
     // 包含: namespace-selector + resource-sections
   })
   ```

2. **創建 NamespaceSelectorComponent**
   ```typescript
   // 專門處理命名空間選擇
   @Input() namespaces: string[]
   @Input() selectedNamespace: string
   @Input() isLoading: boolean
   @Output() namespaceChange = new EventEmitter<string>()
   ```

3. **創建 ResourceSectionComponent** (通用資源區塊)
   ```typescript
   // 可重用的手風琴資源區塊
   @Input() title: string             // "Deployment Commands"
   @Input() resources: string[]       // ["app-v1", "app-v2"]  
   @Input() selectedResource: string
   @Input() templates: CommandTemplate[]
   @Input() isExpanded: boolean
   @Output() resourceChange = new EventEmitter<string>()
   @Output() templateExecute = new EventEmitter<CommandTemplate>()
   @Output() toggleExpanded = new EventEmitter<void>()
   ```

#### **Phase 2: 輸出顯示拆分 (90 min)**

1. **創建 OutputContainerComponent** (主容器)
   ```typescript
   // 根據 outputType 決定顯示哪種子組件
   @Input() outputType: string
   @Input() isLoading: boolean
   // 包含所有輸出子組件的條件渲染
   ```

2. **創建各種輸出組件**
   ```typescript
   // TableOutputComponent - 單一表格
   @Input() headers: string[]
   @Input() data: KubeResource[]
   
   // MultipleTablesComponent - 多表格  
   @Input() tables: TableData[]
   @Input() expandedTables: Set<string>
   @Output() toggleTable = new EventEmitter<string>()
   
   // MultipleYamlsComponent - 多 YAML
   @Input() yamls: YamlItem[]
   @Input() expandedYamls: Set<string>
   @Output() toggleYaml = new EventEmitter<string>()
   
   // PodDescribeComponent - Pod describe 輸出
   @Input() podData: PodDescribeData[]
   @Input() expandedPods: Set<string>
   @Output() togglePod = new EventEmitter<string>()
   
   // RawOutputComponent - 原始文字
   @Input() content: string
   ```

3. **創建 CommandInputComponent**
   ```typescript
   // 專門處理命令輸入和執行
   @Input() command: string
   @Input() isLoading: boolean
   @Output() commandChange = new EventEmitter<string>()
   @Output() commandExecute = new EventEmitter<void>()
   @Output() keyboardShortcut = new EventEmitter<KeyboardEvent>()
   ```

#### **Phase 3: 主組件簡化 (45 min)**

1. **簡化 DashboardComponent**
   ```typescript
   // 只保留：
   // - 服務注入和數據獲取
   // - 子組件間的數據傳遞
   // - 高層業務邏輯
   // 移除：
   // - 具體的 UI 邏輯  
   // - 複雜的模板渲染
   // - 低層的事件處理
   ```

2. **重構模板結構**
   ```html
   <div class="dashboard-container">
     <app-command-sidebar 
       [namespaces]="namespaces()"
       [selectedNamespace]="selectedNamespace()"
       (namespaceChange)="onNamespaceChange($event)"
       (templateExecute)="executeTemplate($event)">
     </app-command-sidebar>
     
     <div class="main-content">
       <app-command-input
         [command]="customCommand()"
         [isLoading]="isLoading()"
         (commandExecute)="executeCustomCommand()">
       </app-command-input>
       
       <app-output-container
         [outputType]="outputType()"
         [data]="getAllOutputData()">
       </app-output-container>
     </div>
   </div>
   ```

### 🎯 拆分的好處

1. **可維護性**: 每個組件 < 200 行，職責單一
2. **可重用性**: ResourceSectionComponent 可用於任何資源類型
3. **可測試性**: 小組件更容易單元測試
4. **並行開發**: 不同開發者可以同時修改不同組件
5. **效能優化**: 可以針對特定組件做 OnPush 優化

### 📊 拆分後的預期大小

```
dashboard.component.ts:        ~100 行 (從 305 行)
dashboard.component.html:      ~50 行  (從 685 行)
command-sidebar.component.*:   ~150 行
namespace-selector.component.*: ~80 行
resource-section.component.*:   ~120 行
template-list.component.*:      ~60 行
command-input.component.*:      ~80 行
output-container.component.*:   ~100 行
各種輸出組件:                   ~60-100 行 each
```

### 🚀 實作順序建議

1. **先從 Sidebar 開始** - 影響範圍較小，容易測試
2. **再拆 Output 組件** - 複雜度高，需要仔細規劃
3. **最後簡化主組件** - 整合所有拆分的組件

**預計總時間: 3-4 小時，建議分 2-3 個 session 完成**

---

## 🎯 執行順序與依賴關係分析

### ⚡ **立即可執行 (無依賴)**
這些任務可以立即開始，不需要等待其他任務完成：

1. **✅ ResourceService 重構** (已完成)
2. **🔧 輸出格式修復** (Phase 1: 30 min)
   - 修復 Events 表格 `LAST SEEN` 欄位
   - 實作 `multiple-yamls` 輸出類型
   - **優先度: HIGH** - 影響基本功能

3. **📝 Template Service 擴展** (45 min) 
   - 新增 `generateRolloutTemplates()` 方法
   - **優先度: MEDIUM** - 為 rollout 功能準備

### 🔗 **有依賴關係的任務**

#### **Rollout 功能依賴鏈：**
```
ResourceService 重構 ✅
    ↓
Template Service 擴展 📝
    ↓  
Sidebar 拆分 (Deployment Section) 📋
    ↓
Rollout 控制台 UI 🎬
    ↓
進階 Rollout 功能 🚀
```

#### **Dashboard 拆分依賴鏈：**
```
基礎功能穩定 (輸出格式修復) 🔧
    ↓
Sidebar 拆分 📋 (60 min)
    ↓
Output 組件拆分 📊 (90 min)  
    ↓
主組件簡化 🏗️ (45 min)
```

### 📅 **建議執行順序**

#### **第一輪 (今天下午) - 基礎修復**
```
1. 🔧 輸出格式修復 (30 min) - 立即執行
   └── 修復 Events 表格、multiple-yamls 輸出
   
2. 📝 Template Service 擴展 (45 min) - 接續執行
   └── 新增 rollout 相關模板方法
```
**總計: 75 分鐘**

#### **第二輪 (明天/下次) - Rollout 功能**
```
3. 📋 Sidebar 拆分 - Deployment Section 先行 (30 min)
   └── 只拆分 Deployment 相關組件，為 rollout 準備空間
   
4. 🎬 Rollout 控制台基礎版 (60 min)
   └── 在拆分後的 Deployment Section 中加入 rollout UI
   
5. 🚀 Rollout 進階功能 (60 min) - Optional
   └── 實時狀態更新、版本比較等
```
**總計: 150 分鐘**

#### **第三輪 (後續) - 完整 Dashboard 拆分**
```
6. 📋 完整 Sidebar 拆分 (剩餘 30 min)
   └── 拆分其餘的 Pod、Service 區塊
   
7. 📊 Output 組件拆分 (90 min)
   └── 拆分各種輸出顯示組件
   
8. 🏗️ 主組件簡化 (45 min)
   └── 整合所有拆分的組件
```
**總計: 165 分鐘**

### 🎯 **核心洞察**

1. **Rollout 功能不需要等完整 Dashboard 拆分**
   - 只需要拆分 Deployment Section 就夠了
   - 可以在部分拆分的基礎上先實作 rollout

2. **輸出格式修復是基礎**
   - 影響所有功能的正確顯示
   - 應該最優先處理

3. **分階段拆分策略**
   - 不需要一次拆分整個 Dashboard
   - 可以針對需要的部分（如 Deployment）先拆分

4. **Template Service 是關鍵中間件**
   - 連接 UI 和 K8s 服務
   - 擴展後可以支持更多操作類型

### ✨ **今天下午的最佳策略**

**建議執行: 第一輪 (75 分鐘)**
- 🔧 修復輸出格式問題 
- 📝 擴展 Template Service

這樣可以：
- ✅ 修復現有的顯示問題
- ✅ 為 rollout 功能打好基礎
- ✅ 不涉及複雜的組件拆分
- ✅ 風險低，效果明顯



1. 不要有 index.ts? sidebar 就是 command-sidebar.component 當作 index?
