import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { FAQ } from './knowledgeBase.js';

/**
 * 選用的 AI 回覆。僅在「FAQ 未命中、非紅線、非危機」時使用。
 * 嚴格約束在品牌語氣與紅線內；不確定就回傳 null，交由真人處理。
 */

const client = config.ai.enabled ? new Anthropic({ apiKey: config.ai.apiKey }) : null;

// 把 FAQ 濃縮成 AI 可參考的脈絡（只給非危機題，危機題一律走標準逐字回覆）
const faqContext = FAQ.filter((f) => f.category !== 'E')
  .map((f) => `[${f.id}] ${f.keywords.join('、')} → ${f.answer.replace(/\n/g, ' ')}`)
  .join('\n');

const SYSTEM_PROMPT = `你是視界學院的官方客服助理。用「視界學院官方」語氣回覆：穩、正、遠。

語氣規範：
- 主詞用「我們／視界學院」，絕不用「我／我個人／我覺得」。
- 直接、清楚、有禮貌；正式內容句末不放表情符號。
- 禁用流行語、注音文、「保證／一定／絕對」、施壓式催單。
- 對客戶稱「您」。

紅線（任一觸發，回覆固定為 {"reply": null, "needs_human": true}，不要自由發揮）：
- 投資、理財、個股、收益保證。
- 前公司、創辦團隊爭議、負評指控等敏感題。
- 學員個資、金流、帳務、退費。
- 宗教、命理、政治。

行為準則：
- 只根據下方 FAQ 脈絡與一般禮貌性回覆作答；不得編造課程內容、價格、日期、政策。
- 若問題超出 FAQ 範圍、需要查資料、或你信心不足 → 回傳 {"reply": null, "needs_human": true}。
- 一律只輸出 JSON：{"reply": "給客戶的回覆文字或 null", "needs_human": true/false}。

FAQ 脈絡：
${faqContext}`;

/**
 * @returns {Promise<{reply: string|null, needsHuman: boolean}>}
 */
export async function aiReply(userText) {
  if (!client) return { reply: null, needsHuman: true };

  try {
    const res = await client.messages.create({
      model: config.ai.model,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userText }],
    });

    const raw = res.content?.[0]?.type === 'text' ? res.content[0].text : '';
    const parsed = safeParseJson(raw);
    if (!parsed) return { reply: null, needsHuman: true };

    const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : null;
    const needsHuman = parsed.needs_human === true || reply === null;
    return { reply, needsHuman };
  } catch (err) {
    console.error('[aiReply] 失敗，改走轉真人：', err.message);
    return { reply: null, needsHuman: true };
  }
}

function safeParseJson(text) {
  if (!text) return null;
  // 容錯：抓出第一個 { ... } 區塊
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
