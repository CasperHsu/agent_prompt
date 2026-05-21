# 合約簽署系統 — 移交到 vision-eco-crm

這份文件是給「新 session 在 vision-eco-crm repo 內動工」用的 brief。
請新 session 先讀完這份再開工。

---

## 0. Mission

在 vision-eco-crm 內新增一個**符合台灣《電子簽章法》的線上合約簽署模組**，
支援承攬合約與課程合約兩種類型，未來爭議時可作為法律證據鏈。

走方案 1（融進 CRM）：共用 Supabase Auth、Supabase DB、Supabase Storage、
Resend、Sentry，**不另起獨立服務**。

## 1. Tech Stack 硬性約束（CRM 既有）

| 元件 | 版本 / 選型 |
|---|---|
| Next.js | 16.2.4 (App Router) |
| React | 18.3.1 |
| TypeScript | 5 |
| Tailwind CSS | 3.4.13（手寫，**不要用 shadcn/ui**） |
| 資料層 | `@supabase/supabase-js` + `@supabase/ssr`（**不要用 Drizzle / Prisma**） |
| Auth | Supabase Auth |
| 檔案 | Supabase Storage |
| Email | Resend（**直接 fetch**，無 SDK） |
| 圖示 | lucide-react |
| 錯誤監控 | Sentry |

不要新增 ORM。不要新增 UI library。風格對齊 CRM 既有頁面。

## 2. Architecture（已決定，照做不要重議）

### 2.1 分級驗證策略

| 合約類型 | 驗證強度 | 機制 |
|---|---|---|
| 承攬合約 | 強 | Email + 手機 OTP + 雙證件上傳 + TSA 時戳 |
| 課程合約 | 基本 | Email + 手機 OTP + 完整稽核軌跡 |

每個範本（template）可獨立設定驗證等級，不寫死在 code。

### 2.2 三段式簽署流程

```
閱讀合約 → 身分驗證（OTP）→ 簽名 + 同意條款勾選 → 完成
```

完成後可下載：簽署完成的 PDF、TSA 時戳檔（.tsr）、驗證結果 JSON。

### 2.3 法律證據鏈四層

| 層 | 機制 |
|---|---|
| 文件完整性 | 範本套版後計 SHA-256「文件指紋」；簽署時計「封存指紋」綁定簽名 |
| 身分證明 | OTP 驗證軌跡 + 證件 + IP/UA |
| 簽署意願 | 三段流程 + 同意條款勾選 + 簽名 canvas |
| 時序固定 | 對最終 PDF 打 TWCA RFC 3161 時戳 |

### 2.4 稽核軌跡 hash chain

每筆操作寫進 `signing_audit_logs`，每筆含 `prev_hash`（上一筆的 hash）與 `hash`（自己的 hash）。
任何一筆被竄改都可被偵測（提供 `verifyAuditChain(contractId)` 函式）。

## 3. 資料模型（轉成 Supabase migration）

需要建立 5 張表 + 5 個 enum。完整 SQL 可直接參考：

> 來源：`agent_prompt` repo @ `claude/clarify-capabilities-mojp6` 分支
> 路徑：`contract-signing/drizzle/0000_whole_captain_america.sql`

把那份 SQL 轉成 Supabase migration（`supabase/migrations/<timestamp>_contract_signing.sql`）。
需要的修改：
- `defaultRandom()` → `gen_random_uuid()`（pgcrypto，Supabase 已啟用）
- 加上 RLS policies（見 §3.2）
- 把 `signature_image_path` / `signed_pdf_path` 改成 Supabase Storage 物件 path（不是檔系路徑）

### 3.1 表（簡述）

| 表 | 用途 |
|---|---|
| `contract_templates` | 合約範本，含 markdown body、變數定義、驗證等級、TSA 開關 |
| `contracts` | 合約實例，含 signing_token、變數值、render 後 HTML、各種 hash、TSA token |
| `signing_otps` | OTP 簽發紀錄，code 以 hash 形式儲存 |
| `signing_audit_logs` | append-only 稽核軌跡，hash chain |
| `signing_kyc_records` | 雙證件 KYC（強驗證才需要） |

### 3.2 RLS 大致原則

- `contract_templates`：管理員（CRM 既有 admin role）可 CRUD；公開只能 read active templates（給簽署頁顯示範本名稱）
- `contracts`：管理員 CRUD；簽署人**只能透過 signing_token 讀自己這份**（不用 user_id 對應）
  - 這需要一個 `SECURITY DEFINER` function `get_contract_by_token(token text)` 繞過 RLS
- `signing_otps`：服務端寫，**前端絕對不可 read**
- `signing_audit_logs`：服務端寫，管理員可 read，簽署人可 read 自己合約的軌跡
- `signing_kyc_records`：管理員 read，簽署人 write 自己的

## 4. 模組可重用度

來源都在 `contract-signing/src/...`，可直接複製貼上：

| 模組 | 可重用度 | 動作 |
|---|---|---|
| `lib/asn1/der.ts` | 100% | 直接搬，無相依 |
| `lib/tsa/rfc3161.ts` | 100% | 直接搬 |
| `lib/tsa/client.ts` | 100% | 直接搬（fetch-based） |
| `lib/crypto.ts` | 100% | 直接搬（Node `crypto`） |
| `lib/render.ts` | 100% | 直接搬（純字串處理） |
| `lib/pdf/font.ts` | 95% | 改成從 Supabase Storage / Next public/ 讀字型 |
| `lib/pdf/generate.ts` | 100% | 直接搬 |
| `lib/audit.ts` | 邏輯 100% | **query 全部改用 supabase-js** |
| `lib/otp.ts` | 邏輯 100% | **query 全部改用 supabase-js** |
| 範本文字（CONTRACTOR_BODY / COURSE_BODY） | 100% | 直接搬，見 `scripts/seed.ts` |
| 三段式 UI 元件 | 50% | 邏輯保留，UI 用 CRM 既有 Tailwind 3 風格手寫 |
| `components/signature-pad.tsx` | 95% | 微調 className 對齊 Tailwind 3 |
| `lib/db/*` Drizzle 相關 | 0% | **整個丟掉，改用 supabase-js** |
| `components/ui/*`（shadcn 風） | 0% | **整個丟掉，用 CRM 既有元件** |

## 5. 字型

需要一個中文字型給 PDF 用。建議放在 CRM 的 `public/fonts/NotoSansTC-Regular.otf`，
或上傳到 Supabase Storage 的 `assets` bucket。檔案 5.5MB，來源：
`https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/TC/NotoSansTC-Regular.otf`

## 6. 環境變數（加進 CRM `.env`）

```bash
# 已存在：NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#         RESEND_API_KEY, EMAIL_FROM, SENTRY_DSN

# 新增：
APP_URL=https://crm.visioneco.example
CONTRACT_PDF_FONT_PATH=public/fonts/NotoSansTC-Regular.otf

# TWCA Timestamp（不設 = 用 dev-stub，僅 dev 用）
TWCA_TSA_URL=
TWCA_TSA_USERNAME=
TWCA_TSA_PASSWORD=
TWCA_TSA_POLICY_OID=

# SMS（暫緩，先用 Email OTP，課程合約足夠）
SMS_PROVIDER=
SMS_API_KEY=
```

## 7. 路由規劃（在 CRM 內）

| 路徑 | 用途 | Auth |
|---|---|---|
| `/admin/contracts` | 合約列表 | Supabase Auth（既有 admin） |
| `/admin/contracts/new` | 建合約 | Supabase Auth |
| `/admin/templates` | 範本列表 | Supabase Auth |
| `/sign/[token]` | 公開簽署頁 | 透過 signing_token 驗證（無需登入） |
| `/api/sign/[token]/pdf` | 下載簽署後 PDF | signing_token |
| `/api/sign/[token]/timestamp` | 下載時戳 token | signing_token |
| `/api/sign/[token]/verify` | 驗證 JSON | signing_token（也可開放給管理員） |

## 8. CRM 整合點

完成簽署後，要回寫到 CRM：
- 合約建立時，可選填 `crm_customer_id` 與 `crm_order_id`（既有欄位）
- 簽署完成時，發 `contract.signed` event：更新 CRM 客戶狀態 / 課程訂單狀態
- 建議用 Supabase 的 database webhook 或 trigger function 串接

UI 整合：
- 在 CRM 客戶/訂單詳情頁，加「建立合約」按鈕 → 預填客戶資料導 `/admin/contracts/new`
- 在客戶頁顯示該客戶所有合約清單
- 在訂單頁顯示對應合約狀態

## 9. Phase 順序（建議）

**Phase 1（兩週內可上線基本流程）**
1. Supabase migration（5 張表 + RLS + `get_contract_by_token` RPC）
2. 把 lib 純邏輯模組搬進來（crypto / render / audit / otp / asn1 / tsa / pdf）
3. 把 audit / otp 的 query 重寫為 supabase-js
4. 三段式簽署頁面 UI（Tailwind 3 + 既有元件風格）
5. 管理員建合約頁
6. 接 Resend 寄 OTP（dev 模式 console.log）
7. Seed 兩個內建範本

**Phase 2（兩週內補完法律強度）**
1. PDF 產生（pdf-lib + fontkit + Noto Sans TC）
2. TSA RFC 3161 串接 + dev-stub fallback
3. 申請 TWCA 時戳服務 → 設定 env vars
4. 驗證頁 `/api/sign/[token]/verify`
5. 完整性檢查 UI

**Phase 3（強驗證 + CRM 深度整合）**
1. 雙證件上傳 + KYC 表 + 管理員審核 UI
2. SMS OTP（三竹簡訊 / Twilio）
3. CRM webhook：合約狀態回寫客戶 / 訂單
4. 在 CRM 客戶頁 / 訂單頁嵌入合約清單

## 10. 開始新 session 時的第一句話

> "請按照 `casperhsu/agent_prompt` repo @ `claude/clarify-capabilities-mojp6`
> 分支根目錄的 `HANDOFF_TO_CRM.md` 進行。先讀完整份文件，然後從 Phase 1 第 1 步開始。
> 我希望你在動工前，先列出你打算建立的所有檔案與順序給我確認。"

如果新 session 無法跨 repo 讀檔，把這份 markdown 整份貼給它即可。

## 11. 法規重點摘錄（給新 session 補腦）

- 《電子簽章法》2024 年 5 月新版：電子文件與電子簽章原則上等同書面/簽名
- 第 6 條：依憑證機構簽發之憑證所為之數位簽章，**推定為本人簽署**（舉證責任倒置）
- 一般電子簽章（OTP + 稽核）**法律上有效**，但舉證責任在主張一方
- 時戳：**不是必要**，但有時戳可解決「文件後來被竄改」「簽署時間造假」的爭執
- 因此本系統設計：承攬必打時戳、課程選打、永遠留完整稽核

## 12. 未決事項

- [ ] TWCA 時戳服務的實際申請流程與費率（請聯絡 TWCA 業務）
- [ ] 課程合約是否需要 SMS OTP（目前預設 Email 即可，待商業判斷）
- [ ] 多方簽署（甲乙雙方都要簽）是否在 Phase 1 範圍（目前設計為單方簽）
- [ ] 公開驗證頁是否提供（任何人輸入指紋可查合約真偽）
