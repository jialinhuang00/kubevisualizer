# Okta SAML 設定故障排除指南

本文件記錄 Okta SAML 整合的常見問題和解決方法。

## 問題 1: User is not assigned to this application

### 現象
點擊 Okta 登入按鈕後，**還沒有輸入任何帳戶資訊**就直接顯示：
```
User is not assigned to this application.
```

### 可能原因

#### 原因 1: 用戶確實未被指派到應用 ✅ (最常見)
**檢查方法:**
1. Okta Admin Dashboard → Applications → [你的應用]
2. Assignments 標籤
3. 檢查是否有用戶被指派

**解決方法:**
1. **Assign** → **Assign to People**
2. 選擇要指派的用戶
3. **Assign** → **Save and Go Back**

#### 原因 2: Okta Admin Session 干擾 ⚠️ (隱藏問題)
**現象:** 你目前登入著 Okta Admin Dashboard，系統誤判你要用管理員帳戶進行 SAML 登入。

**解決方法:**
1. **完全登出 Okta Admin Dashboard**
2. **清除瀏覽器 cookies** (*.okta.com)
3. **使用無痕模式**重新測試
4. **或在不同瀏覽器**測試 SAML 登入

#### 原因 3: SAML URL 跳轉錯誤
**檢查:** 確認你們系統跳轉的 URL 格式正確
- ✅ 正確: `https://integrator-123456.okta.com/app/exkXXX/sso/saml`
- ❌ 錯誤: 跳轉到 Admin Dashboard 或其他頁面

### 測試步驟
1. **登出所有 Okta 相關頁面**
2. **開啟無痕模式**
3. **從你們系統點擊 Okta 登入**
4. **應該看到乾淨的 Okta 登入頁面**

## 問題 2: SAML 設定參數錯誤

### 常見錯誤設定

#### Name ID Format 錯誤
❌ **錯誤**: 選擇 "Persistent" 或其他格式
✅ **正確**: 選擇 **"EmailAddress"**

#### Application Username 錯誤  
❌ **錯誤**: 選擇 "Email" (會造成重複映射)
✅ **正確**: 選擇 **"Okta username"**

#### Entity ID 不匹配
❌ **錯誤**: 使用預設值或簡短名稱
✅ **正確**: 使用系統實際的 Entity ID `mammothcyber://idp.auth.mammothcyber.net/saml2`

### 屬性對應設定錯誤

#### 缺少必要屬性
確認包含以下 **Attribute Statements**:
```
Name: email        | Name format: Basic | Value: user.email
Name: firstName    | Name format: Basic | Value: user.firstName  
Name: lastName     | Name format: Basic | Value: user.lastName
```

#### 群組屬性設定錯誤
如需群組同步，**Group Attribute Statements** 應設為:
```
Name: groups
Name format: Unspecified
Filter: Matches regex
Value: .* (所有群組) 或特定群組名稱
```

## 問題 3: App Vendor 設定選擇錯誤

### 正確設定
✅ **"It's required to contact the vendor to enable SAML"** - 勾選這個
❌ **"This is an internal app that we have created"** - 不要勾選這個

### 說明
雖然通常內部開發的應用會選擇 "internal app"，但根據我們系統的特定架構和整合需求，需要選擇 "contact vendor" 選項。這可能是因為：
- 系統有特殊的 SAML 整合要求
- 需要特定的設定流程
- 符合我們內部的標準作業程序

## 問題 4: Metadata 下載或使用錯誤

### 找不到 Metadata
**位置:** 應用建立完成後
1. **Sign On** 標籤
2. **SAML 2.0** 區段  
3. **"Identity Provider metadata"** 連結

### Metadata URL 格式
正確格式: `https://integrator-123456.okta.com/app/exkXXXXXXX/sso/saml/metadata`

### 使用方式
1. **右鍵點擊 metadata 連結** → **另存為** → 儲存 XML 檔案
2. **或直接複製 URL** 到你們系統 (如果支援)

## 問題 5: SCIM 同步設定問題

### Token 認證失敗
**檢查:**
1. 確認從你們系統取得的 SCIM Token 正確
2. 確認 Base URL: `https://your-domain.com/api/v2/scim/v2`
3. 測試連線是否成功

### 用戶同步不正常
**檢查同步設定:**
- **To App**: Create Users, Update User Attributes, Deactivate Users
- **確認屬性對應**: email, firstName, lastName 等

## 設定檢查清單

### ✅ SAML 基本設定
- [ ] **Single sign on URL**: `https://your-domain.com/api/auth/callback/saml`
- [ ] **Audience URI**: `mammothcyber://idp.auth.mammothcyber.net/saml2`  
- [ ] **Name ID format**: EmailAddress
- [ ] **Application username**: Okta username

### ✅ 屬性對應
- [ ] **email**: user.email (Basic)
- [ ] **firstName**: user.firstName (Basic)  
- [ ] **lastName**: user.lastName (Basic)
- [ ] **groups**: user.groups (Unspecified, Matches regex, .*)

### ✅ 用戶指派
- [ ] 測試用戶已被指派到應用
- [ ] 指派狀態為 Active
- [ ] App Username 正確顯示

### ✅ App Vendor
- [ ] 勾選 "It's required to contact the vendor to enable SAML"
- [ ] 不要勾選 "This is an internal app that we have created"

### ✅ Metadata
- [ ] 成功下載 XML 檔案或取得 URL
- [ ] 已上傳到你們系統
- [ ] 格式正確 (包含 EntityDescriptor)

## 測試流程

### 1. 基本連通性測試
1. **Sign On 標籤** → **"Preview SAML assertion"**
2. 選擇測試用戶
3. 查看產生的 SAML 內容

### 2. 實際 SSO 測試
1. **確保登出所有 Okta 相關頁面**
2. **使用無痕模式**
3. **從你們系統點擊 Okta 登入**
4. **輸入 Okta 帳密**
5. **確認成功跳轉回你們系統**

### 3. 屬性同步測試  
1. 登入成功後檢查你們系統中的用戶資料
2. 確認 email, 姓名等資訊正確
3. 如有群組設定，確認角色分配正確

### 4. SCIM 同步測試 (如有設定)
1. 在 Okta 建立新用戶 → 確認同步到你們系統
2. 修改用戶資料 → 確認更新同步
3. 停用用戶 → 確認狀態同步

## 成功指標

✅ **Session 乾淨**: 無痕模式下能正常跳轉到登入頁面  
✅ **用戶指派**: 測試用戶能成功通過 SAML 認證  
✅ **屬性同步**: 用戶資料正確顯示在你們系統中
✅ **群組權限**: 用戶角色根據 Okta 群組正確分配
✅ **SCIM 運作**: 用戶建立、更新、停用都能正常同步

## 與 Azure AD 比較

### Okta 的優勢
✅ **無租戶切換問題**: 不會有多帳戶混淆  
✅ **設定更直觀**: 介面清楚，步驟明確
✅ **錯誤訊息清楚**: 更容易定位問題
✅ **無權限複雜性**: 沒有 Assignment Required 的混淆

### 注意事項
⚠️ **Session 干擾**: Admin Dashboard 登入狀態可能影響 SAML 測試
⚠️ **必須指派用戶**: 預設沒有用戶能訪問新建立的應用
⚠️ **屬性對應**: 需要明確設定才會發送用戶資料