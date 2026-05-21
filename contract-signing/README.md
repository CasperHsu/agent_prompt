# 線上合約簽署系統

符合台灣《電子簽章法》的線上承攬合約與課程合約簽署平台。為日後可能的爭議提供完整法律證據鏈：身分驗證、簽署意願、文件完整性、稽核軌跡。

## 設計理念

| 層次 | 機制 |
|---|---|
| 身分驗證 | 分級（Email/SMS OTP、雙證件、視訊KYC、自然人憑證）依合約類型套用 |
| 簽署意願 | 三段式流程：閱讀 → OTP 驗證 → 簽名 + 同意條款勾選 |
| 文件完整性 | 合約 HTML 產生時計算 SHA-256「文件指紋」；簽署時計算「封存指紋」綁定簽名 |
| 稽核軌跡 | 每個操作寫入 hash chain（每筆含 `prev_hash` + `hash`），任一筆被竄改可被偵測 |
| 時戳 | （Phase 2）整合 TWCA TSA，承攬合約預設啟用、課程合約預設關閉 |
| 長期保存 | （Phase 2）PDF/A-3 + PAdES LTV，封入憑證鏈與 OCSP/CRL |

## 技術棧

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Drizzle ORM + Postgres 16
- Zod、react-hook-form
- 計畫整合：pdf-lib（PDF 產生）、TWCA TSA（時戳）、Resend/三竹（通知）

## 快速開始

```bash
pnpm install

# 啟動本機 Postgres
docker compose up -d

# 設定環境變數
cp .env.example .env.local
# 編輯 .env.local，至少設定 DATABASE_URL 與 ADMIN_API_TOKEN

# 套用 schema
pnpm db:push

# 載入內建範本（標準承攬合約、課程上課合約）
pnpm seed

# 啟動開發伺服器
pnpm dev
```

開啟 <http://localhost:3000>。

## 主要路由

| 路徑 | 用途 |
|---|---|
| `/` | 入口介紹 |
| `/admin/contracts` | 管理員：合約列表 |
| `/admin/contracts/new` | 管理員：建立新合約（選範本、填變數、產生簽署連結） |
| `/admin/templates` | 管理員：範本列表 |
| `/sign/[token]` | 簽署人：三段式簽署流程（公開連結，token 驗證） |

## 開發狀態

### Phase 1（已完成）

- [x] 資料模型：templates、contracts、OTPs、audit logs、KYC
- [x] 範本變數套版引擎（`{{variable}}`）+ 簡易 Markdown → HTML
- [x] 文件指紋與封存指紋（SHA-256）
- [x] 稽核軌跡 hash chain + 驗證函式
- [x] 三段式簽署流程 UI（閱讀 → OTP → 簽名）
- [x] 簽名板（HTML5 canvas）
- [x] 管理員建立合約 UI
- [x] OTP 簽發/驗證（dev 模式 console.log 印出 code）

### Phase 2（待做）

- [ ] PAdES PDF 簽章（pdf-lib + node-signpdf）
- [ ] TWCA TSA 時戳串接
- [ ] PDF 長期保存（LTV）
- [ ] Email / SMS 實際發送（Resend、三竹簡訊）
- [ ] 雙證件上傳 + 視訊 KYC（strong 等級才需要）

### Phase 3（待做）

- [ ] 整合 vision-eco CRM：webhook 通知、客戶資料同步、合約狀態回寫
- [ ] 範本 UI 編輯器
- [ ] 多方簽署（甲乙雙方都要簽）
- [ ] 公開驗證頁（輸入指紋或 ID 可驗證合約真偽）

## 法規依據

- 《電子簽章法》（2024年5月新版）
- 第 4 條：電子文件與電子簽章原則上等同書面/簽名
- 第 6 條：依憑證機構簽發之憑證所為之數位簽章，推定為本人簽署
- 第 9 條：使用數位簽章須符合主管機關公告之標準

> 一般電子簽章（OTP + 稽核）法律上仍具效力，但**舉證責任在主張一方**。
> 數位簽章 + TSA 時戳則具**法律推定效力**，舉證責任倒置。
> 本系統依合約類型分級設計。

## 整合 CRM

`contracts` 表已預留欄位：
- `crm_customer_id`：對應 CRM 客戶 ID
- `crm_order_id`：對應 CRM 訂單 / 課程報名 ID

CRM 整合方式（規劃中）：
1. CRM 觸發建合約 → 呼叫本系統 REST API（headers 帶 `x-admin-token`）
2. 本系統回傳簽署連結 → CRM 寄給客戶
3. 簽署完成 → 本系統 webhook 通知 CRM 更新狀態
