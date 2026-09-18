import * as line from '@line/bot-sdk';
import { config } from './config.js';

export const lineConfig = {
  channelAccessToken: config.line.channelAccessToken,
  channelSecret: config.line.channelSecret,
};

export const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.line.channelAccessToken,
});

/** 用 replyToken 回覆一則或多則文字訊息 */
export async function replyText(replyToken, texts) {
  const messages = (Array.isArray(texts) ? texts : [texts])
    .filter(Boolean)
    .slice(0, 5) // LINE 單次最多 5 則
    .map((text) => ({ type: 'text', text }));
  if (!messages.length) return;
  await lineClient.replyMessage({ replyToken, messages });
}

/** 主動推送（用於通知真人客服 / 主管） */
export async function pushText(to, text) {
  if (!to || !text) return;
  try {
    await lineClient.pushMessage({ to, messages: [{ type: 'text', text }] });
  } catch (err) {
    console.error('[lineClient] 推播失敗：', err.message);
  }
}
