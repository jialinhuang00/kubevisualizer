# Azure AD SAML 設定故障排除指南

本文件記錄 Azure AD SAML 整合的常見問題和解決方法。

## 問題 1: 應用類型選擇困惑

### 現象
在 Azure AD Enterprise Applications 中看到三個選項：
- Configure Application Proxy for secure remote access to an on-premises application
- Register an application to integrate with Microsoft Entra ID (App you're developing)  
- Integrate any other application you don't find in the gallery (Non-gallery)

### 解決方法
**選擇 "Non-gallery"**

**各選項說明:**
- **Application Proxy** ❌: 用於內部網路的舊應用遠端訪問
- **Register application** ❌: 用於開發新應用整合 Microsoft Graph API  
- **Non-gallery** ✅: 用於任何外部 SAML 應用的 SSO 整合

## 問題 2: SAML 參數長度限制錯誤

### 現象
```
2 validation errors detected: 
Value '[605d73b7679bb4140eb04aa160b5e042d9b20df7760d5843002ce0ce548c5516]' at 'idpIdentifiers' failed to satisfy constraint: Member must have length less than or equal to 40
Value '605d73b7679bb4140eb04aa160b5e042d9b20df7760d5843002ce0ce548c5516' at 'providerName' failed to satisfy constraint: Member must have length less than or equal to 32
```

### 原因
AWS Cognito (後端使用) 對 IdP 識別碼有長度限制：
- Provider Name ≤ 32 字元
- IdP Identifier ≤ 40 字元

### 解決方法
在系統中使用較短的識別碼：
```
Provider Name: azure-ad                    (≤32字元)
IdP Identifier: company-azure-saml         (≤40字元)  
Display Name: Azure AD Login
```

## 問題 3: Entity ID 不匹配錯誤

### 現象  
```
AADSTS700016: Application with identifier 'mammothcyber://idp.auth.mammothcyber.net/saml2' was not found in the directory
```

### 原因
Azure AD 中設定的 Entity ID 與系統實際使用的不一致。

### 解決方法
**修改 Azure AD 的 Basic SAML Configuration:**
1. Single sign-on → Basic SAML Configuration → Edit
2. **Identifier (Entity ID)**: `mammothcyber://idp.auth.mammothcyber.net/saml2`
3. **Reply URL**: `https://your-domain.com/api/auth/callback/saml`  
4. Save

**重要:** Entity ID 必須完全匹配系統的設定，不是越短越好！

## 問題 4: 用戶權限被阻擋

### 現象
```
AADSTS50105: Your administrator has configured the application to block users unless they are specifically granted access. The signed in user is blocked because they are not a direct member of a group with access.
```

### 原因
Azure AD 應用預設需要明確指派用戶才能訪問。

### 解決方法

**方法 1: 修改應用設定 (推薦測試用)**
1. Enterprise Applications → [你的應用] → Properties
2. **Assignment required?** 改成 **No**
3. Save

**方法 2: 指派特定用戶**
1. Enterprise Applications → [你的應用] → Users and groups  
2. Add user/group
3. 選擇要授權的用戶
4. Assign

## 問題 5: 上傳錯誤的 Metadata

### 現象
上傳了系統自己產生的 metadata 而不是 Azure AD 的。

### 識別方法
檢查 XML 檔案內容：
```xml
❌ 錯誤 (系統的 metadata):
<EntityDescriptor entityID="saml.proxy.appaegis.net">
<SingleSignOnService Location="https://dev.ce.mammothcyber.io/koopa/saml2/sso/...">

✅ 正確 (Azure AD 的 metadata):  
<EntityDescriptor entityID="https://sts.windows.net/[tenant-id]/">
<SingleSignOnService Location="https://login.microsoftonline.com/[tenant-id]/saml2">
```

### 解決方法
1. 在 Azure AD 應用的 Single sign-on 頁面
2. "SAML Signing Certificate" 區段  
3. 下載 **"Federation Metadata XML"**
4. 上傳這個檔案到系統

## 設定流程總結

### 1. Azure AD 設定
```
Application Type: Non-gallery
Application Name: Portal Web App
Basic SAML Configuration:
  - Identifier: mammothcyber://idp.auth.mammothcyber.net/saml2
  - Reply URL: https://your-domain.com/api/auth/callback/saml
Properties:
  - Assignment required: No (測試用)
```

### 2. 系統設定  
```
Provider Name: azure-ad
IdP Identifier: company-azure-saml  
Display Name: Azure AD Login
Upload: Azure AD 的 Federation Metadata XML
```

### 3. 測試步驟
1. 從系統登入頁面點擊 Azure AD 按鈕
2. 跳轉到 Azure AD 登入頁面
3. 輸入 Azure AD 帳密
4. 登入成功後返回系統

## 常見混淆點

### Entity ID 長度
- **AWS/Cognito**: 有長度限制，影響 Provider Name 和 IdP Identifier
- **Azure AD**: Entity ID 可以較長，重點是兩邊一致

### XML 下載位置
- **Azure AD**: Single sign-on → SAML Signing Certificate → Federation Metadata XML  
- **不是**: App registrations (那是給開發者用的)

### 權限設定位置
- **正確**: Enterprise Applications → Properties → Assignment required
- **錯誤**: App registrations 中找不到這個設定

## 成功指標

✅ **Entity ID 匹配**: Azure AD 和系統使用相同的 Entity ID  
✅ **用戶可登入**: 沒有 AADSTS50105 權限錯誤
✅ **跳轉正常**: 能在 Azure AD 和系統間正確跳轉
✅ **用戶資料同步**: 登入後系統顯示正確的用戶信息