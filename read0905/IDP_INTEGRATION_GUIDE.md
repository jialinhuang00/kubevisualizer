# IdP 操作設定指南

本指南說明如何在各個 IdP 平台上設定 SSO 集成的具體操作步驟。

## 支援的 IdP

- **Google Workspace** (原 G Suite)
- **Okta**  
- **Azure AD** (Microsoft Entra ID)
- **Ping Identity**
- **OneLogin**
- **Custom SAML** (自訂 IdP)

## 我們系統提供的設定參數

在每個 IdP 平台設定時，你需要填入以下固定值：

```
ACS URL: https://your-domain.com/api/auth/callback/saml
Entity ID: https://your-domain.com/api/auth/saml/metadata  
SCIM Base URL: https://your-domain.com/api/v2/scim/v2
SCIM Token: [需從我們系統取得，見各平台設定步驟]
```

## 個人測試帳戶申請

## 1. Google Workspace 操作步驟

### 申請測試帳戶
- **費用**: $6/月/用戶 (14天免費試用)
- **申請連結**: https://workspace.google.com/
- **⚠️ 重要限制**: 
  - 需要付費方案才能使用 Admin Console
  - 個人 Gmail 帳戶無法訪問 admin.google.com
  - 必須有自己的域名或讓 Google 代為註冊域名 (額外 $12/年)
  - 註冊時需要選擇 "個人專屬方案" 並填寫付費資訊

### 在 Google Admin Console 中設定 SAML
1. **登入管理控制台**: admin.google.com
2. **導航**: Apps → Web and mobile apps → SAML apps
3. **建立應用**:
   - 點擊 "+" → "Add custom SAML app"
   - 填入應用名稱 (例如："公司Portal")
4. **下載 IdP 資訊**: 
   - 下載 "Option 2" 的 Metadata file (XML格式)
   - 保存這個檔案，稍後上傳到我們系統
5. **設定 Service Provider Details**:
   - **ACS URL**: `https://your-domain.com/api/auth/callback/saml`
   - **Entity ID**: `https://your-domain.com/api/auth/saml/metadata`
   - **Start URL**: 留空
   - **Signed response**: 勾選
6. **設定 Attribute Mapping**:
   - Basic Information → First Name: `givenName`
   - Basic Information → Last Name: `sn`  
   - Basic Information → Primary Email: `emailAddress`
7. **啟用應用**: 選擇 "ON for everyone" 或特定 OU

### 設定 SCIM (可選)
1. **取得 SCIM Token**: 從我們系統的 IdP 設定頁面取得
2. **在 Google Admin Console**:
   - 暫時 Google Workspace 不直接支援 SCIM
   - 建議使用 Google Directory API 或第三方工具

---

## 2. Okta 操作步驟

### 申請測試帳戶  
- **費用**: 免費 (Developer Edition)
- **申請連結**: https://developer.okta.com/signup/
- **限制**: 15,000 月活躍用戶，無時間限制

### 在 Okta Admin Dashboard 中設定

#### Step 1: 建立 SAML 應用
1. **登入**: 你的 Okta Admin domain (例如: `https://integrator-123456-admin.okta.com`)
2. **導航**: Applications → Create App Integration
3. **選擇集成類型**:
   - **Sign-in method**: SAML 2.0
   - 點擊 "Next"
4. **應用基本資訊**:
   - **App name**: "Portal Web App" 或 "公司Portal"
   - **App logo**: 可選
   - **App visibility**: 保持預設
   - 點擊 "Next"

#### Step 2: Configure SAML Settings
1. **Single sign on URL**: `https://your-domain.com/api/auth/callback/saml`
2. **Audience URI (SP Entity ID)**: `mammothcyber://idp.auth.mammothcyber.net/saml2`
3. **Default RelayState**: 留空
4. **Name ID format**: **EmailAddress** ← 重要！
5. **Application username**: **Okta username** ← 不是 Email！
6. **Update application username on**: 保持預設

#### Step 3: Attribute Statements (屬性對應)
新增以下屬性對應：

| Name | Name format | Value |
|------|-------------|--------|
| `email` | Basic | `user.email` |
| `firstName` | Basic | `user.firstName` |
| `lastName` | Basic | `user.lastName` |

**設定方法**:
1. 點擊 "Add Attribute Statement"
2. **Name**: 填入 `email`
3. **Name format**: 選擇 **Basic**
4. **Value**: 填入 `user.email`
5. 重複以上步驟新增其他屬性

#### Step 4: Group Attribute Statements (群組同步)
如需群組功能，新增群組對應：

1. 點擊 "Add Group Attribute Statement"
2. **Name**: `groups`
3. **Name format**: **Unspecified**
4. **Filter**: 選擇 **Matches regex**
5. **Value**: 填入 `.*` (所有群組) 或特定群組名稱

#### Step 5: App Vendor 設定
在 "Connect app vender" 區段：
- **不要勾選**: "This is an internal app that we have created"
- **勾選**: **"It's required to contact the vendor to enable SAML"**

**注意**: 雖然這個選項通常是給第三方應用使用，但根據我們系統的架構需求，需要選擇這個選項

#### Step 6: 完成並下載 Metadata
1. **點擊 "Next"** → **點擊 "Finish"**
2. **應用建立完成後**，前往 **Sign On** 標籤
3. **在 "SAML 2.0" 區段**找到 **"Identity Provider metadata"**
4. **右鍵點擊連結** → **另存為** → 儲存 XML 檔案
   - 或複製 metadata URL: 類似 `https://integrator-123456.okta.com/app/exkv42746l74w8Uda697/sso/saml/metadata`

#### Step 7: 指派用戶
1. **Assignments** 標籤
2. **Assign** → **Assign to People**
3. **選擇測試用戶** → **Assign** → **Save and Go Back**
4. **或建立群組指派**: Assign → Assign to Groups

### 詳細設定說明

#### Name ID Format: EmailAddress
- Okta 會將用戶的 email 作為唯一識別碼發送給你們系統
- 這是最標準且相容性最高的設定

#### Application Username: Okta username  
- 使用 Okta 的內部用戶名 (通常是 email)
- **不要選 Email**，這會造成重複映射問題

#### Attribute Statements 作用
- **email**: 發送用戶 email 給你們系統
- **firstName/lastName**: 發送用戶姓名資料
- 你們系統會根據這些資料建立或更新用戶資料

#### Group Attribute Statements 作用  
- 發送用戶所屬群組資訊
- **Matches regex `.*`**: 發送所有群組
- **Matches regex `admin|manager`**: 只發送特定群組
- 你們系統可根據群組資訊分配角色

### 設定 SCIM 同步 (可選)
1. **在 Okta 應用中**:
   - **Provisioning** 標籤 → **Configure API Integration**
   - 勾選 **"Enable API integration"**
2. **填入 SCIM 設定**:
   - **Base URL**: `https://your-domain.com/api/v2/scim/v2`
   - **API Token**: [從你們系統取得的 SCIM Token]
3. **啟用同步功能**:
   - **To App**: 勾選 Create Users, Update User Attributes, Deactivate Users
   - **儲存設定**

### 測試流程
1. **基本連通性測試**: 在 Sign On 標籤點擊 "Preview SAML assertion"
2. **實際登入測試**: 從你們系統點擊 Okta 登入按鈕
3. **屬性檢查**: 確認用戶資料正確同步到你們系統
4. **群組測試**: 確認用戶角色根據 Okta 群組正確分配

### ⚠️ 常見問題和故障排除

#### 問題 1: "User is not assigned" 錯誤
**現象:** 點擊登入按鈕後，**還沒輸入帳戶資訊**就顯示用戶未分配錯誤

**可能原因:**
1. **用戶確實未被指派**: 前往 Assignments 標籤指派測試用戶
2. **Admin Session 干擾**: 你目前登入著 Okta Admin，系統誤判要用管理員帳戶登入
3. **SAML URL 錯誤**: 跳轉到錯誤的 URL

**解決方法:**
1. 確認用戶已被指派到應用
2. **登出所有 Okta 頁面**，使用**無痕模式**測試
3. 檢查 SAML 跳轉 URL 格式正確

#### 問題 2: App Vendor 設定困惑
**正確選擇**: "It's required to contact the vendor to enable SAML"
**錯誤選擇**: "This is an internal app that we have created"
**說明**: 根據我們系統架構，需要選擇 vendor contact 選項

#### 問題 3: 屬性對應問題
確保設定正確的屬性對應：
- **Name ID format**: EmailAddress (不是其他格式)
- **Application username**: Okta username (不是 Email)
- **必要屬性**: email, firstName, lastName

#### 問題 4: 找不到 Metadata
**正確位置**: Sign On 標籤 → SAML 2.0 區段 → "Identity Provider metadata"
**下載方式**: 右鍵另存為 XML 檔案，或複製 URL

詳細的故障排除步驟請參考：**[Okta 故障排除指南](./OKTA_TROUBLESHOOTING.md)**

---

## 3. Azure AD 操作步驟

### 申請測試帳戶
- **費用**: 免費 (Azure 免費帳戶)
- **申請連結**: https://azure.microsoft.com/free/
- **需要**: Microsoft 個人帳戶 (Outlook、Hotmail 等)

### 在 Azure Portal 中設定
1. **登入**: portal.azure.com
2. **導航**: Azure Active Directory → Enterprise applications
3. **建立應用**:
   - "New application" → "Create your own application"  
   - **選擇**: "Integrate any other application you don't find in the gallery (Non-gallery)"
   - Name: "Portal Web App" 或 "公司Portal"
4. **設定 Single Sign-On**:
   - 點擊建立後的應用 → Single sign-on → SAML
5. **Basic SAML Configuration**:
   - **Identifier (Entity ID)**: `mammothcyber://idp.auth.mammothcyber.net/saml2` (須與系統一致)
   - **Reply URL**: `https://your-domain.com/api/auth/callback/saml`
   - **Sign on URL**: `https://your-domain.com/login` (可選)
6. **User Attributes & Claims**:
   - 預設設定通常已足夠
   - 可新增群組聲明 (可選): Groups → "All groups"
7. **下載 Metadata**:
   - 在 "SAML Signing Certificate" 區段下載 **"Federation Metadata XML"**
8. **用戶權限設定**:
   - Properties → **Assignment required?** 改成 **No** (測試用)

### 設定 SCIM (可選)
1. **在應用設定中**:
   - Provisioning → Get started → Automatic
2. **Tenant URL**: `https://your-domain.com/api/v2/scim/v2`
3. **Secret Token**: [從我們系統取得的 SCIM Token]
4. **測試連線** → 儲存
5. **設定同步規則**:
   - Mappings → Provision Azure Active Directory Users
   - 確保基本屬性對應正確

### ⚠️ 常見問題
Azure AD 設定過程中可能遇到各種錯誤，詳細的故障排除步驟請參考：  
**[Azure AD 故障排除指南](./AZURE_AD_TROUBLESHOOTING.md)**

---

## 4. Ping Identity 操作步驟

### 申請測試帳戶
- **費用**: 免費基本方案 (10,000 認證/月)  
- **申請連結**: https://www.pingidentity.com/en/try-ping.html

### 在 PingOne 中設定
1. **登入**: console.pingone.com
2. **建立應用**:
   - Applications → "+" → SAML
   - Application name: "公司Portal"
3. **SAML Configuration**:
   - **ACS URLs**: `https://your-domain.com/api/auth/callback/saml`
   - **Entity ID**: `https://your-domain.com/api/auth/saml/metadata`
   - **Assertion Validity Duration**: 300 seconds
4. **Attribute Mapping**:
   - `saml_subject`: Email Address
   - `given_name`: Given Name  
   - `family_name`: Family Name
   - `email`: Email Address
5. **下載 Metadata**:
   - Configuration → Download Metadata
6. **啟用應用**: Toggle "Enabled"

### 設定 SCIM  
1. **在 PingOne**:
   - Applications → [你的應用] → Resources → SCIM
2. **設定**:
   - **SCIM URL**: `https://your-domain.com/api/v2/scim/v2`
   - **Bearer Token**: [從我們系統取得]
3. **同步設定**: 啟用用戶和群組同步

---

## 5. OneLogin 操作步驟

### 申請測試帳戶
- **費用**: 免費 Developer Edition (2,500 用戶)
- **申請連結**: https://www.onelogin.com/developer-signup

### 在 OneLogin Admin Portal 中設定
1. **登入**: 你的 OneLogin subdomain
2. **建立應用**:
   - Apps → Add App
   - 搜尋: "SAML Test Connector (IdP w/ attr)"
   - Select
3. **Configuration 標籤**:
   - **Display Name**: "公司Portal"
   - **ACS (Consumer) URL**: `https://your-domain.com/api/auth/callback/saml`  
   - **ACS (Consumer) URL Validator**: `https://your-domain\.com/api/auth/callback/saml`
   - **SAML 2.0 Endpoint**: 保持預設
   - **SAML Signature Algorithm**: SHA-256
4. **Parameters 標籤**:
   - 新增參數:
     - `FirstName`: First Name
     - `LastName`: Last Name
     - `Email`: Email
5. **SSO 標籤**:
   - 下載 "SAML Metadata" 檔案
6. **Access 標籤**: 指派角色/用戶

### 設定 SCIM
1. **在 OneLogin**:
   - Apps → [你的應用] → Provisioning
2. **設定**:
   - **SCIM Base URL**: `https://your-domain.com/api/v2/scim/v2/`
   - **SCIM Bearer Token**: [從我們系統取得]
3. **Rules**: 設定用戶建立、更新、刪除規則

---

## 在我們系統中的設定流程

### 1. 上傳從 IdP 下載的 Metadata 檔案
1. 登入我們的管理後台
2. 前往 **身份提供商設定** 頁面  
3. 點擊 **新增 IdP**
4. 選擇 IdP 類型 (Okta、Azure AD 等)
5. 上傳從 IdP 下載的 XML metadata 檔案
6. 設定顯示名稱 (用戶看到的登入按鈕文字)

### 2. 基本參數設定
- **IdP 名稱**: 唯一識別碼 (例如: company-okta)
- **顯示名稱**: "公司 Okta 登入"
- **預設角色**: 新用戶自動分配的角色
- **啟用狀態**: 開啟/關閉此 IdP

### 3. 群組同步設定 (可選)
- **群組屬性名稱**: IdP 傳送群組資訊的屬性名稱 (通常是 "groups")
- **允許的群組**: 只有這些群組的用戶能登入
- **群組角色對應**: 設定 IdP 群組對應到我們系統的哪個角色

### 4. 取得 SCIM Token (如需用戶同步)
1. 在 IdP 設定頁面中
2. 點擊 **產生 SCIM Token**
3. 複製產生的 Token
4. 在 IdP 的 SCIM 設定中貼上此 Token

## 測試步驟

### 1. 基本 SSO 登入測試
1. **開啟登入頁面**: 前往 `https://your-domain.com/login`
2. **檢查 IdP 按鈕**: 確認看到新增的 IdP 登入按鈕
3. **點擊登入**: 點擊 IdP 按鈕，應該跳轉到 IdP 登入頁面
4. **完成登入**: 在 IdP 頁面輸入帳密登入
5. **回到系統**: 登入成功後應自動跳回我們系統並完成登入

### 2. 用戶資料同步測試
1. **檢查用戶資料**: 登入後檢查個人資料是否正確
2. **測試屬性對應**: 確認姓名、Email 等資訊正確顯示
3. **測試多次登入**: 登出再登入，確認資料一致

### 3. 群組權限測試 (如有設定)
1. **在 IdP 設定測試用戶群組**: 例如加入 "admin" 群組
2. **重新登入我們系統**: 確認角色權限正確
3. **變更群組測試**: 在 IdP 移除群組，重新登入測試

### 4. SCIM 同步測試 (如有設定)
1. **在 IdP 建立新用戶**: 確認用戶同步到我們系統
2. **修改用戶資料**: 在 IdP 修改用戶資訊，確認同步更新
3. **停用用戶**: 在 IdP 停用用戶，確認我們系統也停用

---

## 常見問題排除

### ❌ 點擊 IdP 按鈕後跳轉失敗
**可能原因:**
- IdP 中的 ACS URL 設定錯誤
- IdP 應用未啟用或未指派用戶

**解決方法:**
1. 檢查 IdP 中的 ACS URL 是否為 `https://your-domain.com/api/auth/callback/saml`
2. 確認 IdP 應用已啟用
3. 確認測試用戶已被指派到應用

### ❌ 登入後顯示錯誤或權限不足
**可能原因:**
- 用戶在我們系統中沒有對應角色
- 群組對應設定錯誤

**解決方法:**
1. 檢查系統中的預設角色設定
2. 確認群組屬性名稱設定正確
3. 檢查允許的群組名單

### ❌ 用戶資料不完整或錯誤
**可能原因:**
- IdP 的屬性對應設定不正確
- IdP 中用戶資料不完整

**解決方法:**
1. 檢查 IdP 中的屬性對應設定 (firstName, lastName, email)
2. 確認 IdP 中用戶資料完整
3. 重新下載並上傳 IdP metadata

### ❌ SCIM 同步不工作
**可能原因:**
- SCIM Token 過期或錯誤
- SCIM URL 設定錯誤
- IdP 的同步功能未啟用

**解決方法:**
1. 重新產生 SCIM Token 並更新到 IdP
2. 確認 SCIM URL: `https://your-domain.com/api/v2/scim/v2`
3. 檢查 IdP 中的用戶同步設定是否啟用

### ❌ 多個 IdP 衝突
**可能原因:**
- 相同 Email 的用戶在不同 IdP 中存在
- IdP 名稱重複

**解決方法:**
1. 確保每個 IdP 的名稱唯一
2. 決定主要 IdP，其他作為備用
3. 統一用戶 Email 格式

---

## 重要提醒

### 🔐 安全考量
- **定期更換 SCIM Token**: 建議每 90 天更換一次
- **最小權限原則**: 只給必要的群組/用戶訪問權限
- **監控登入活動**: 定期檢查異常登入記錄

### 📋 維護檢查清單
- [ ] SSL 憑證有效 (到期前 30 天更換)
- [ ] IdP metadata 更新 (IdP 變更時)
- [ ] SCIM Token 有效性
- [ ] 測試帳戶定期登入驗證
- [ ] 備份 IdP 設定檔案

### 📞 緊急聯絡
如果 IdP 登入完全失敗，可以透過以下方式登入：
1. **管理員後門**: 直接使用系統管理員帳戶
2. **備用 IdP**: 如有設定多個 IdP
3. **本地帳戶**: 如有保留系統內建帳戶