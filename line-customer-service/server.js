import express from 'express';
import * as line from '@line/bot-sdk';
import { config, assertConfig } from './src/config.js';
import { lineConfig, replyText, pushText } from './src/lineClient.js';
import { decideReply, offHoursNotice } from './src/responder.js';
import { logConversation, anonymize } from './src/logger.js';

assertConfig();

const app = express();

// 健康檢查（給部署平台 / 監控用），需放在 webhook 之前且不吃 raw body
app.get('/', (_req, res) => res.send('視界學院 LINE 客服 Bot 運行中'));
app.get('/healthz', (_req, res) => res.json({ ok: true, aiEnabled: config.ai.enabled }));

// LINE webhook（middleware 會驗簽，必須用原始 body）
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  // 先回 200，避免 LINE 因處理時間過長重送
  res.sendStatus(200);

  const events = req.body?.events || [];
  await Promise.all(events.map(handleEvent));
});

async function handleEvent(event) {
  try {
    if (event.type !== 'message' || event.message?.type !== 'text') return;

    const userText = event.message.text;
    const userId = event.source?.userId;

    const result = await decideReply(userText);

    // 轉真人 / 升級類，且非服務時間 → 補上非服務時間提示
    const messages = [result.reply];
    if (result.needsHuman) {
      const notice = offHoursNotice();
      if (notice) messages.push(notice);
    }
    await replyText(event.replyToken, messages);

    // 彙整記錄（去識別化）
    logConversation({
      userId,
      category: result.category,
      summary: userText.slice(0, 50),
      action: result.action,
      faqHit: result.faqHit,
      faqId: result.faqId,
      status: result.status,
      crisis: result.crisis,
      note: result.note,
    });

    // 升級 / 需真人 → 通知主管（若有設定）
    if (result.action === 'escalate' || result.needsHuman) {
      await notifyEscalation({ userId, userText, result });
    }
  } catch (err) {
    console.error('[handleEvent] 錯誤：', err);
    if (event.replyToken) {
      await replyText(event.replyToken, '您好，這個問題我們幫您轉給專人處理，請稍候。').catch(() => {});
    }
  }
}

async function notifyEscalation({ userId, userText, result }) {
  const to = config.service.escalationNotifyTo;
  if (!to) return;
  const flag = result.crisis ? '🔴 危機(E)' : '🟡 待真人';
  const text =
    `${flag} 客服轉接通知\n` +
    `客戶：${anonymize(userId)}\n` +
    `分類：${result.category}　動作：${result.action}\n` +
    `問題：${userText.slice(0, 80)}\n` +
    (result.crisis ? '⚠️ 請存證並對照 crisis-playbook §8 升級閾值' : '請於 30 分鐘內接手');
  await pushText(to, text);
}

app.listen(config.port, () => {
  console.log(`視界學院 LINE 客服 Bot 已啟動 → port ${config.port}`);
  console.log(`AI 回覆：${config.ai.enabled ? '啟用（' + config.ai.model + '）' : '停用（未命中一律轉真人）'}`);
});
