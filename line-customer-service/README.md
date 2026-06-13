# 視界學院 LINE 客服 Bot

LINE 官方帳號的客服 webhook 後端：**FAQ 自動回覆 → 紅線守門 → 真人轉接 → 對話彙整**。

對應知識庫：`v-playbook-notes/customer-service/`（FAQ、話術、SOP、彙整模板）。
回覆語氣與紅線：`v-playbook-notes/brand-voice.md`、`red-lines.md`、`crisis-playbook.md`。

---

## 它做什麼

收到 LINE 訊息後，依 `sop.md` 流程處理：

1. **分類 + 比對 FAQ**（`knowledgeBase.js`）— 命中就用標準答案回。
2. **紅線守門**（`classifier.js`）— 投資、前公司、宗教政治等一律標準閃避或轉真人，不自由發揮。
3. **危機題（E 類）** — 逐字使用 `crisis-playbook §7` 口徑，標記升級並通知主管存證。
4. **AI 回覆（選用）**（`aiReply.js`）— FAQ 未命中且非紅線時，用知識庫＋品牌語氣產生回覆；不確定就轉真人。
5. **轉真人** — 金流／帳號／個資／投訴／未命中 → 轉接並（選用）通知主管。
6. **彙整記錄**（`logger.js`）— 每通對話去識別化後寫入 `logs/conversations.jsonl`，供週報分析。

---

## 架構

```
LINE 平台
   │ webhook (POST /webhook，含簽章驗證)
   ▼
server.js ──► responder.decideReply()
                 ├─ classifier  （分類 + FAQ + 紅線）
                 ├─ knowledgeBase（FAQ / 話術 / 婉拒）
                 └─ aiReply     （選用 Claude API 回覆）
                 ▼
            replyText（回客戶） + logger（彙整） + pushText（通知主管）
```

| 檔案 | 職責 |
|------|------|
| `server.js` | Express + LINE webhook 進入點 |
| `src/config.js` | 環境變數、服務時間判斷 |
| `src/knowledgeBase.js` | FAQ 資料、紅線關鍵字、話術（對應 faq.md） |
| `src/classifier.js` | 分類、FAQ 比對、紅線偵測 |
| `src/responder.js` | 核心決策流程（對應 sop.md §1） |
| `src/aiReply.js` | 選用的 Claude API 回覆（嚴守語氣與紅線） |
| `src/logger.js` | 去識別化對話記錄（對應 intake-template.md） |
| `src/lineClient.js` | LINE 回覆 / 推播封裝 |
| `scripts/weekly-report.js` | 從 log 產生客服週報 |

---

## 安裝與啟動

```bash
cd line-customer-service
npm install
cp .env.example .env   # 填入 LINE 金鑰等
npm start              # 或 npm run dev（檔案變動自動重啟）
```

### 設定 LINE

1. 到 [LINE Developers Console](https://developers.line.biz/) 建立 Messaging API channel。
2. 取得 `Channel access token` 與 `Channel secret`，填入 `.env`。
3. 把 Webhook URL 設為 `https://你的網域/webhook` 並啟用。
4. 關閉「自動回應訊息」、開啟「Webhook」。

> 本機開發可用 `ngrok http 3000` 之類工具取得對外網址。

### 啟用 AI 回覆（選用）

在 `.env` 填 `ANTHROPIC_API_KEY` 即啟用。留空則 FAQ 未命中一律轉真人（最保守）。
`CLAUDE_MODEL` 預設用快速、低成本的模型，可依需要調整。

---

## 環境變數

見 `.env.example`。重點：

| 變數 | 必填 | 說明 |
|------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | LINE channel token |
| `LINE_CHANNEL_SECRET` | ✅ | LINE channel secret（webhook 驗簽） |
| `ANTHROPIC_API_KEY` | ✕ | 啟用 AI 回覆 |
| `CLAUDE_MODEL` | ✕ | AI 模型 |
| `SERVICE_HOURS_START/END`、`SERVICE_DAYS` | ✕ | 服務時間，非服務時段自動告知 |
| `ESCALATION_NOTIFY_TO` | ✕ | 轉真人/升級時通知的 LINE id |
| `COURSE_PAGE_URL`、`SIGNUP_URL` | ✕ | 話術中的連結 |

---

## 測試

用 Node 內建測試框架（免額外依賴）：

```bash
npm test
```

涵蓋分類/紅線偵測（`test/classifier.test.js`）與決策流程（`test/responder.test.js`）：FAQ 命中、投資紅線閃避、E 類危機升級、兜底紅線婉拒、未命中轉真人等。

---

## 部署

### Docker

```bash
docker build -t line-cs .
docker run -p 3000:3000 --env-file .env line-cs
```

健康檢查端點 `/healthz`，容器內建 HEALTHCHECK。

### Render（一鍵）

repo 內含 `render.yaml`。在 [Render](https://render.com) 連到此 repo（rootDir 已設為 `line-customer-service`），機密值（LINE 金鑰、`ANTHROPIC_API_KEY` 等）在 Dashboard 設定，不要寫進檔案。部署後把 `https://<your-app>.onrender.com/webhook` 填回 LINE Webhook URL。

> 其他平台（Railway、Fly.io、自架）同理：設好環境變數、對外暴露 `PORT`、webhook 指向 `/webhook` 即可。

---

## 彙整與週報

- 每通對話寫入 `logs/conversations.jsonl`（已被 `.gitignore` 忽略，**不進版控、不上雲端**）。
- 記錄已**去識別化**：不存原始 userId，改存 HMAC 代號（對齊 `red-lines.md` A3 個資原則）。
- 產生週報：

```bash
npm run report                       # 最近 7 天
node scripts/weekly-report.js 2026-06-07 2026-06-13
```

輸出格式對應 `intake-template.md §2`：量、分類分布、FAQ 未命中清單（≥3 次提示補 FAQ）、E 類危機趨勢。

---

## 設計原則（與品牌規範一致）

- **保守優先**：不確定就轉真人，寧可少答不要亂答。
- **紅線不可逾越**：投資、前公司、個資、宗教政治 — 程式層強制守門，AI 也被約束。
- **危機口徑一致**：E 類逐字沿用 crisis-playbook，程式不改寫。
- **隱私**：對話記錄去識別化、不上雲端。

---

## 維護

- 改 FAQ → 同步改 `src/knowledgeBase.js` 與 `v-playbook-notes/customer-service/faq.md`，二者不可不一致。
- 從週報「未命中清單」補新題（重複 ≥ 3 次優先）。
- E 類任何變動 → 必與 `crisis-playbook.md §7` 同步。
