import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

/**
 * 對話彙整記錄 — 對應 v-playbook-notes/customer-service/intake-template.md
 *
 * 隱私（red-lines.md A3）：
 * - 不存原始 userId，改存去識別化代號（HMAC 雜湊前 8 碼）。
 * - logs/ 已被 .gitignore 忽略，不會進版控、不上雲端。
 * - 寫成 JSONL，方便後續匯入週報彙整。
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'conversations.jsonl');

// 用來雜湊 userId 的鹽；每次啟動隨機，確保 log 內代號穩定但不可反推
const SALT = process.env.LOG_SALT || crypto.randomBytes(16).toString('hex');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

/** userId → 去識別化代號 U-xxxxxxxx */
export function anonymize(userId) {
  if (!userId) return 'U-anonymous';
  const h = crypto.createHmac('sha256', SALT).update(userId).digest('hex');
  return `U-${h.slice(0, 8)}`;
}

/**
 * 記一筆對話。欄位對應 intake-template.md §1。
 * @param {object} entry
 */
export function logConversation(entry) {
  ensureDir();
  const record = {
    timestamp: new Date().toISOString(),
    channel: 'LINE',
    customer: anonymize(entry.userId),
    category: entry.category, // A|B|C|D|E|F
    summary: entry.summary, // 一句話摘要（這裡用客戶原文截斷）
    action: entry.action, // auto_reply | transfer_human | escalate
    faqHit: entry.faqHit,
    faqId: entry.faqId || null,
    status: entry.status, // 已解決 | 待真人 | 升級
    crisis: Boolean(entry.crisis),
    note: entry.note || '',
  };
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    console.error('[logger] 寫入失敗：', err.message);
  }
  return record;
}

export { LOG_FILE };
