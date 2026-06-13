import { config } from './config.js';

/**
 * FAQ 知識庫 — 對應 v-playbook-notes/customer-service/faq.md
 * 每筆：id / category / keywords（命中關鍵字）/ answer / needsHuman（標準答案仍需真人接手）
 *
 * 維護原則：
 * - 新增/修改題目時，務必與 faq.md 同步，避免口徑不一致。
 * - E 類（危機）answer 為 crisis-playbook §7 逐字內容，不可改寫。
 */

// answer 可用函式產生（注入連結等動態內容）
const link = config.links;

export const FAQ = [
  // ── A 課程 ──
  {
    id: 'A1',
    category: 'A',
    keywords: ['有哪些課', '課程有哪些', '什麼課', '課程列表', '開哪些'],
    answer: `您好，謝謝您對視界學院的關注。\n我們的課程資訊與最新梯次都整理在官方頁面：${link.coursePage}\n如果想了解哪一門最適合自己，也可以告訴我們您目前的狀況，我們為您建議。`,
    needsHuman: false,
  },
  {
    id: 'A2',
    category: 'A',
    keywords: ['教什麼', '課程內容', '上課內容', '學到什麼', '課程大綱'],
    answer: `視界學院專注於認知與自我實現的長期陪伴，著重在重塑認知邊界、建立選擇的底氣。\n詳細大綱在這裡：${link.coursePage}\n想針對某一門深入了解，歡迎告訴我們。`,
    needsHuman: false,
  },
  {
    id: 'A3',
    category: 'A',
    keywords: ['新手', '沒有基礎', '零基礎', '適合我嗎', '適不適合'],
    answer: `您好，課程設計上會照顧不同起點的學員，循序漸進。\n如果方便，您可以簡單說一下目前的狀況與想達成的目標，我們幫您看看哪一門較合適。`,
    needsHuman: false,
  },
  {
    id: 'A4',
    category: 'A',
    keywords: ['投資', '理財', '股票', '個股', '基金', '加密', '虛擬貨幣', '幣', '賺錢', '收益', '報酬'],
    answer: `您好，視界學院目前不開設任何投資、理財或個股相關課程或內容。\n我們專注在認知與自我實現的陪伴。感謝您的理解。`,
    needsHuman: false,
    redline: true, // 投資為 A 級紅線，固定標準閃避
  },

  // ── B 報名付款 ──
  {
    id: 'B1',
    category: 'B',
    keywords: ['怎麼報名', '如何報名', '報名方式', '在哪報名', '想報名'],
    answer: `您好，報名可以直接從官方頁面操作：${link.signup}\n流程上有任何卡關，告訴我們，我們協助您完成。`,
    needsHuman: false,
  },
  {
    id: 'B2',
    category: 'B',
    keywords: ['費用', '多少錢', '價格', '價錢', '分期', '學費'],
    answer: `您好，各課程費用與付款方式（含分期）都列在課程頁：${link.coursePage}\n想確認某一門的方案，告訴我們課程名稱，我們為您說明。`,
    needsHuman: false,
  },
  {
    id: 'B3',
    category: 'B',
    keywords: ['發票', '收據', '統編', '抬頭', '報帳'],
    answer: `可以的。報名時請填寫抬頭與統編（如需），我們會依規定開立。\n已完成報名要補開或修改，請提供訂單資訊，我們為您處理。`,
    needsHuman: true,
  },
  {
    id: 'B4',
    category: 'B',
    keywords: ['沒收到確認', '重複扣款', '扣款', '付了款', '付款失敗', '刷了兩次'],
    answer: `很抱歉造成困擾。請提供您的姓名與訂單／交易時間，我們立即為您查詢與處理。`,
    needsHuman: true,
  },

  // ── C 上課與服務 ──
  {
    id: 'C1',
    category: 'C',
    keywords: ['線上還是實體', '線上', '實體', '到哪上課', '上課地點', '在哪上課'],
    answer: `您好，上課方式依課程而定，課程頁會註明：${link.coursePage}\n想確認某一門，告訴我們課程名稱即可。`,
    needsHuman: false,
  },
  {
    id: 'C2',
    category: 'C',
    keywords: ['什麼時候開始', '開課時間', '課表', '上課時間', '何時開課'],
    answer: `您好，開課時間與課表會在報名完成後通知，也可在學員專區查看。\n若還沒收到，提供您的姓名與報名課程，我們幫您確認。`,
    needsHuman: true,
  },
  {
    id: 'C3',
    category: 'C',
    keywords: ['請假', '補課', '回放', '錄影', '看回放', '缺課'],
    answer: `您好，請假與補課方式依各課程規定，我們為您確認後回覆。\n請告訴我們您報名的課程與日期。`,
    needsHuman: true,
  },
  {
    id: 'C4',
    category: 'C',
    keywords: ['真人', '專人', '客服', '聯絡老師', '找老師', '聯絡人'],
    answer: `您好，我們已為您轉接專人，請稍候，會盡快回覆您。`,
    needsHuman: true,
  },

  // ── D 帳號技術 ──
  {
    id: 'D1',
    category: 'D',
    keywords: ['登入', '登不進', '密碼', '忘記密碼', '無法登入'],
    answer: `您好，請先試試登入頁的「忘記密碼」重設。\n若仍無法登入，提供您註冊的 Email，我們協助處理。`,
    needsHuman: true,
  },
  {
    id: 'D2',
    category: 'D',
    keywords: ['收不到', '沒收到信', '沒收到通知', 'email', '信箱'],
    answer: `您好，麻煩先確認垃圾信匣，並將我們的寄件信箱加入聯絡人。\n仍未收到的話，提供您的註冊 Email，我們為您檢查。`,
    needsHuman: true,
  },
  {
    id: 'D3',
    category: 'D',
    keywords: ['打不開', '看不了', '影片', '教材', '播放', '當機', '跑不出來'],
    answer: `很抱歉造成不便。請告訴我們您使用的裝置與瀏覽器，以及打不開的頁面，我們協助排查。`,
    needsHuman: true,
  },

  // ── E 危機 / 敏感（逐字使用 crisis-playbook §7，不可改寫）──
  {
    id: 'E1',
    category: 'E',
    keywords: ['前公司', '糾紛', '離職', '跳槽', '原本的公司', '舊公司'],
    answer: `您好，謝謝您關心。\n視界學院創辦團隊過去的工作經歷與離職決定，都是經過深思熟慮的選擇。\n我們選擇用視界學院的工作品質回應一切聲音。\n如果您對視界學院的課程或服務有任何具體疑問，我們很樂意說明。`,
    needsHuman: true,
    crisis: true,
  },
  {
    id: 'E2',
    category: 'E',
    keywords: ['不感恩', '不成熟', '背叛', '人品', '老師的為人'],
    answer: `您好。\n視界學院不對前公司事務做評論，這是我們的原則。\n我們相信每一個人離開或留下的決定，都有自己的考量。\n視界學院專注做好自己的事——把學員的成果做出來。`,
    needsHuman: true,
    crisis: true,
  },
  {
    id: 'E3',
    category: 'E',
    keywords: ['加盟', '報名過前公司', '之前的課程', '會有影響嗎'],
    answer: `您好。\n您與其他單位的合約是您個人的決定，視界學院不評論其他單位事務。\n如果您對視界學院的課程內容、報名方式有疑問，我們可以詳細為您介紹。`,
    needsHuman: true,
    crisis: true,
  },
  {
    id: 'E4',
    category: 'E',
    keywords: ['負評', '負面', '指控', '爆料', '黑料', '是不是真的', '網路上說', 'dcard', 'ptt'],
    answer: `您好，謝謝您願意直接來問我們。\n視界學院選擇用具體的學員成果與工作態度，回應外界的聲音。\n若您有任何關於課程或服務的具體疑問，我們很樂意一一說明。`,
    needsHuman: true,
    crisis: true,
  },
];

/** 紅線關鍵字（除 FAQ 外的兜底偵測；命中即不自由發揮，走標準閃避或轉真人） */
export const REDLINE_PATTERNS = [
  { type: 'invest', keywords: ['保證獲利', '穩賺', '躺著賺', '翻倍', '年化', '報明牌', '買什麼股'] },
  { type: 'religion_politics', keywords: ['宗教', '命理', '算命', '政治', '選舉', '政黨', '統獨'] },
  { type: 'guarantee', keywords: ['保證', '一定賺', '絕對'] },
];

/** 婉拒話術（對應 reply-scripts.md §6） */
export const DECLINE_SCRIPTS = {
  invest: '您好，視界學院目前不提供任何投資、理財相關的建議或課程，感謝您的理解。',
  religion_politics: '您好，這部分不在我們服務的範圍。關於視界學院的課程與服務，我們很樂意說明。',
  guarantee: '我們不做任何收益或成果的保證。視界學院做的，是陪您扎實地走一段路。',
};

/** 通用話術（對應 reply-scripts.md） */
export const SCRIPTS = {
  greeting: '您好，這裡是視界學院，很高興為您服務。請問有什麼可以協助您的呢？',
  transferHuman: '您好，這個問題我們幫您轉給專人處理，請稍候，會盡快回覆您。',
  offHours: (start, end) =>
    `您好，目前為非服務時間。我們的服務時間是 ${start}:00–${end}:00，您留下的訊息我們上線後會第一時間回覆您。`,
  fallback: '您好，這個問題我們幫您轉給專人處理，請稍候，會盡快回覆您。',
};
