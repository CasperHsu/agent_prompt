import "dotenv/config";
import { db, contractTemplates, type TemplateField } from "@/lib/db";
import { eq } from "drizzle-orm";

const CONTRACTOR_BODY = `# 承攬合約書

立合約書人：
甲方（委託方）：Vision Eco
乙方（承攬方）：{{signerName}}

雙方茲就承攬事項達成下列協議：

## 第一條　承攬標的

乙方承攬甲方之以下工作項目：

{{workScope}}

## 第二條　承攬報酬

本承攬契約報酬總額為新臺幣 {{contractAmount}} 元整（含稅）。

付款方式：{{paymentTerms}}

## 第三條　工作期間

工作起始日：{{startDate}}
預定完成日：{{endDate}}

## 第四條　智慧財產權

乙方所完成之工作成果，其著作權及相關智慧財產權於甲方付清報酬後歸甲方所有。

## 第五條　保密義務

乙方對於因履行本契約所知悉之甲方營業秘密、客戶資料等，負有保密義務，本契約終止後仍應繼續遵守。

## 第六條　違約處理

任一方違反本契約之約定，致他方受損害者，應負損害賠償責任。

## 第七條　管轄法院

本契約涉訟時，雙方合意以臺灣臺北地方法院為第一審管轄法院。

## 第八條　其他

本契約未盡事宜，依中華民國相關法令及誠信原則辦理。本契約以電子簽章方式簽署，依《電子簽章法》規定具同等書面效力。

立約日期：{{todayDate}}
`;

const COURSE_BODY = `# 課程上課契約書

學員姓名：{{signerName}}
報名 Email：{{signerEmail}}

報名課程：{{courseName}}
課程期間：{{courseStartDate}} ～ {{courseEndDate}}
課程費用：新臺幣 {{courseFee}} 元整

## 第一條　課程內容

學員報名參加上述課程，課程內容、時數與授課方式以官方課程說明為準。

## 第二條　學費繳納

學員應於開課前完成全額繳費。如選擇分期付款，依雙方另行約定之分期方案辦理。

## 第三條　退費規範

依教育部相關規定及消費者保護法辦理：

- 開課前申請退費：扣除行政費後全額退還
- 開課後 1/3 課程內申請：退還 2/3 學費
- 開課後超過 1/3：恕不退費

## 第四條　智慧財產權

課程教材、講義、影音內容之著作權皆屬本機構所有，學員不得複製、轉售或於公開場合使用。

## 第五條　個人資料保護

本機構依《個人資料保護法》規定蒐集、處理及利用學員個人資料，僅用於課程相關事宜。

## 第六條　其他

本契約以電子簽章方式簽署，依《電子簽章法》規定具同等書面效力。

立約日期：{{todayDate}}
`;

const CONTRACTOR_FIELDS: TemplateField[] = [
  {
    key: "workScope",
    label: "承攬工作範圍",
    type: "textarea",
    required: true,
    placeholder: "請詳細描述承攬之工作項目、交付物與驗收標準",
  },
  {
    key: "contractAmount",
    label: "合約金額（新臺幣）",
    type: "number",
    required: true,
    placeholder: "例如：300000",
  },
  {
    key: "paymentTerms",
    label: "付款方式",
    type: "textarea",
    required: true,
    placeholder: "例如：簽約後預付 30%，期中 40%，驗收後 30%",
  },
  {
    key: "startDate",
    label: "工作起始日",
    type: "date",
    required: true,
  },
  {
    key: "endDate",
    label: "預定完成日",
    type: "date",
    required: true,
  },
];

const COURSE_FIELDS: TemplateField[] = [
  {
    key: "courseName",
    label: "課程名稱",
    type: "text",
    required: true,
    placeholder: "例如：永續經營實戰營 2026 春季班",
  },
  {
    key: "courseStartDate",
    label: "課程開始日",
    type: "date",
    required: true,
  },
  {
    key: "courseEndDate",
    label: "課程結束日",
    type: "date",
    required: true,
  },
  {
    key: "courseFee",
    label: "課程費用（新臺幣）",
    type: "number",
    required: true,
    placeholder: "例如：18000",
  },
];

async function upsertTemplate(input: {
  name: string;
  type: "contractor" | "course";
  bodyMarkdown: string;
  requiredFields: TemplateField[];
  verificationLevel: "basic" | "medium" | "strong";
  requireTsa: boolean;
  expiryDays: number;
}) {
  const existing = await db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.name, input.name))
    .limit(1);

  if (existing[0]) {
    await db
      .update(contractTemplates)
      .set({
        bodyMarkdown: input.bodyMarkdown,
        requiredFields: input.requiredFields,
        verificationLevel: input.verificationLevel,
        requireTsa: input.requireTsa,
        expiryDays: input.expiryDays,
        updatedAt: new Date(),
      })
      .where(eq(contractTemplates.id, existing[0].id));
    console.log(`✓ updated: ${input.name}`);
  } else {
    await db.insert(contractTemplates).values(input);
    console.log(`✓ inserted: ${input.name}`);
  }
}

async function main() {
  console.log("Seeding contract templates...");

  await upsertTemplate({
    name: "標準承攬合約",
    type: "contractor",
    bodyMarkdown: CONTRACTOR_BODY,
    requiredFields: CONTRACTOR_FIELDS,
    verificationLevel: "strong",
    requireTsa: true,
    expiryDays: 14,
  });

  await upsertTemplate({
    name: "課程上課合約",
    type: "course",
    bodyMarkdown: COURSE_BODY,
    requiredFields: COURSE_FIELDS,
    verificationLevel: "basic",
    requireTsa: false,
    expiryDays: 7,
  });

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
