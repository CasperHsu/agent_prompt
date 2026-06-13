import 'dotenv/config';

function parseList(value, fallback = []) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  },
  port: Number(process.env.PORT) || 3000,
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
  },
  service: {
    hoursStart: Number(process.env.SERVICE_HOURS_START ?? 10),
    hoursEnd: Number(process.env.SERVICE_HOURS_END ?? 18),
    days: parseList(process.env.SERVICE_DAYS, ['1', '2', '3', '4', '5']).map(Number),
    escalationNotifyTo: process.env.ESCALATION_NOTIFY_TO || '',
  },
  links: {
    coursePage: process.env.COURSE_PAGE_URL || '[課程頁連結]',
    signup: process.env.SIGNUP_URL || '[報名連結]',
  },
};

/** 是否在服務時間內 */
export function isWithinServiceHours(date = new Date()) {
  const day = date.getDay();
  const hour = date.getHours();
  const { days, hoursStart, hoursEnd } = config.service;
  return days.includes(day) && hour >= hoursStart && hour < hoursEnd;
}

/** 啟動時檢查必要設定 */
export function assertConfig() {
  const missing = [];
  if (!config.line.channelAccessToken) missing.push('LINE_CHANNEL_ACCESS_TOKEN');
  if (!config.line.channelSecret) missing.push('LINE_CHANNEL_SECRET');
  if (missing.length) {
    throw new Error(`缺少必要環境變數：${missing.join(', ')}（請參考 .env.example）`);
  }
}
