/**
 * 客服週報產生器 — 讀 logs/conversations.jsonl，輸出對應
 * v-playbook-notes/customer-service/intake-template.md §2 的週報。
 *
 * 用法：
 *   node scripts/weekly-report.js            # 最近 7 天
 *   node scripts/weekly-report.js 2026-06-07 2026-06-13
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', 'logs', 'conversations.jsonl');

const CATEGORY_NAMES = {
  A: 'A 課程',
  B: 'B 報名付款',
  C: 'C 上課服務',
  D: 'D 帳號技術',
  E: 'E 危機敏感',
  F: 'F 其他',
};

function parseArgs() {
  const [, , start, end] = process.argv;
  const now = new Date();
  const from = start ? new Date(start) : new Date(now.getTime() - 7 * 86400000);
  const to = end ? new Date(end + 'T23:59:59') : now;
  return { from, to };
}

function loadRecords() {
  if (!fs.existsSync(LOG_FILE)) {
    console.error(`找不到 log：${LOG_FILE}（Bot 尚未產生對話記錄）`);
    process.exit(1);
  }
  return fs
    .readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

function main() {
  const { from, to } = parseArgs();
  const records = loadRecords().filter((r) => {
    const t = new Date(r.timestamp);
    return t >= from && t <= to;
  });

  const total = records.length;
  const byCat = {};
  let auto = 0;
  let human = 0;
  let escalate = 0;
  let crisisCount = 0;
  const unmatched = {};

  for (const r of records) {
    byCat[r.category] = (byCat[r.category] || 0) + 1;
    if (r.action === 'auto_reply') auto += 1;
    if (r.needsHuman || r.action === 'transfer_human') human += 1;
    if (r.action === 'escalate') escalate += 1;
    if (r.crisis) crisisCount += 1;
    if (!r.faqHit) {
      const key = (r.summary || '').trim();
      if (key) unmatched[key] = (unmatched[key] || 0) + 1;
    }
  }

  const autoRate = total ? Math.round((auto / total) * 100) : 0;
  const unmatchedSorted = Object.entries(unmatched).sort((a, b) => b[1] - a[1]);

  const lines = [];
  lines.push(`## 客服週報 — ${fmt(from)} ~ ${fmt(to)}`);
  lines.push('');
  lines.push('### 量');
  lines.push(`- 總對話數：${total}`);
  lines.push(`- FAQ 自動解決率：${autoRate}%（自答 ${auto} / 總 ${total}）`);
  lines.push(`- 轉真人數：${human} / 升級數：${escalate}`);
  lines.push('');
  lines.push('### 分類分布');
  lines.push('| 類別 | 筆數 | 占比 |');
  lines.push('|------|------|------|');
  for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const n = byCat[code] || 0;
    const pct = total ? Math.round((n / total) * 100) : 0;
    lines.push(`| ${CATEGORY_NAMES[code]} | ${n} | ${pct}% |`);
  }
  lines.push('');
  lines.push('### 找不到答案（FAQ 未命中）清單');
  if (unmatchedSorted.length === 0) {
    lines.push('（本期無未命中）');
  } else {
    unmatchedSorted.forEach(([q, n], i) => {
      const mark = n >= 3 ? ' ← 重複 ≥ 3 次，建議補進 faq.md' : '';
      lines.push(`${i + 1}. ${q}（${n} 次）${mark}`);
    });
  }
  lines.push('');
  lines.push('### E 類趨勢（危機監測）');
  lines.push(`- 本期 E 類筆數：${byCat.E || 0}`);
  lines.push(`- 危機標記筆數：${crisisCount}`);
  lines.push(
    `- 是否達 crisis-playbook §8 升級閾值（≥ 3 人）：${(byCat.E || 0) >= 3 ? '是 ⚠️ 請通報主管' : '否'}`,
  );

  console.log(lines.join('\n'));
}

main();
