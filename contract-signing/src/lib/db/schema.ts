import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const contractTypeEnum = pgEnum("contract_type", ["contractor", "course"]);
export const verificationLevelEnum = pgEnum("verification_level", [
  "basic",
  "medium",
  "strong",
]);
export const contractStatusEnum = pgEnum("contract_status", [
  "draft",
  "sent",
  "viewed",
  "signed",
  "expired",
  "voided",
]);
export const otpChannelEnum = pgEnum("otp_channel", ["email", "sms"]);
export const auditActorEnum = pgEnum("audit_actor", [
  "signer",
  "admin",
  "system",
]);

export const contractTemplates = pgTable(
  "contract_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: contractTypeEnum("type").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    requiredFields: jsonb("required_fields")
      .$type<TemplateField[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    verificationLevel: verificationLevelEnum("verification_level")
      .notNull()
      .default("basic"),
    requireTsa: boolean("require_tsa").notNull().default(false),
    expiryDays: integer("expiry_days").notNull().default(14),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_templates_type").on(table.type)]
);

export type TemplateField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "textarea";
  required: boolean;
  placeholder?: string;
};

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => contractTemplates.id),
    signingToken: text("signing_token").notNull(),
    status: contractStatusEnum("status").notNull().default("draft"),

    title: text("title").notNull(),
    variables: jsonb("variables")
      .$type<Record<string, string | number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    renderedHtml: text("rendered_html"),
    contentHash: text("content_hash"),

    signerName: text("signer_name").notNull(),
    signerEmail: text("signer_email").notNull(),
    signerPhone: text("signer_phone"),
    signerIdNumberLast4: text("signer_id_number_last4"),

    verificationLevel: verificationLevelEnum("verification_level").notNull(),
    requireTsa: boolean("require_tsa").notNull().default(false),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    signedPdfPath: text("signed_pdf_path"),
    signedPdfHash: text("signed_pdf_hash"),
    signatureImagePath: text("signature_image_path"),

    tsaTokenBase64: text("tsa_token_base64"),
    tsaTimestampAt: timestamp("tsa_timestamp_at", { withTimezone: true }),
    tsaProvider: text("tsa_provider"),

    crmCustomerId: text("crm_customer_id"),
    crmOrderId: text("crm_order_id"),

    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_contracts_signing_token").on(table.signingToken),
    index("idx_contracts_status").on(table.status),
    index("idx_contracts_signer_email").on(table.signerEmail),
    index("idx_contracts_crm_customer").on(table.crmCustomerId),
  ]
);

export const signingOtps = pgTable(
  "signing_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    channel: otpChannelEnum("channel").notNull(),
    target: text("target").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_otps_contract").on(table.contractId)]
);

export const signingAuditLogs = pgTable(
  "signing_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    actor: auditActorEnum("actor").notNull(),
    actorId: text("actor_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    geo: jsonb("geo").$type<{ country?: string; region?: string; city?: string }>(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_audit_contract").on(table.contractId),
    index("idx_audit_created_at").on(table.createdAt),
  ]
);

export const signingKycRecords = pgTable("signing_kyc_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  idCardFrontPath: text("id_card_front_path"),
  idCardBackPath: text("id_card_back_path"),
  selfiePath: text("selfie_path"),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contractTemplatesRelations = relations(
  contractTemplates,
  ({ many }) => ({
    contracts: many(contracts),
  })
);

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  template: one(contractTemplates, {
    fields: [contracts.templateId],
    references: [contractTemplates.id],
  }),
  otps: many(signingOtps),
  auditLogs: many(signingAuditLogs),
  kycRecord: one(signingKycRecords),
}));

export const signingOtpsRelations = relations(signingOtps, ({ one }) => ({
  contract: one(contracts, {
    fields: [signingOtps.contractId],
    references: [contracts.id],
  }),
}));

export const signingAuditLogsRelations = relations(
  signingAuditLogs,
  ({ one }) => ({
    contract: one(contracts, {
      fields: [signingAuditLogs.contractId],
      references: [contracts.id],
    }),
  })
);

export const signingKycRecordsRelations = relations(
  signingKycRecords,
  ({ one }) => ({
    contract: one(contracts, {
      fields: [signingKycRecords.contractId],
      references: [contracts.id],
    }),
  })
);

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type NewContractTemplate = typeof contractTemplates.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
export type SigningOtp = typeof signingOtps.$inferSelect;
export type SigningAuditLog = typeof signingAuditLogs.$inferSelect;
export type NewSigningAuditLog = typeof signingAuditLogs.$inferInsert;
