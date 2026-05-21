CREATE TYPE "public"."audit_actor" AS ENUM('signer', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('draft', 'sent', 'viewed', 'signed', 'expired', 'voided');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('contractor', 'course');--> statement-breakpoint
CREATE TYPE "public"."otp_channel" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."verification_level" AS ENUM('basic', 'medium', 'strong');--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "contract_type" NOT NULL,
	"body_markdown" text NOT NULL,
	"required_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_level" "verification_level" DEFAULT 'basic' NOT NULL,
	"require_tsa" boolean DEFAULT false NOT NULL,
	"expiry_days" integer DEFAULT 14 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"signing_token" text NOT NULL,
	"status" "contract_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rendered_html" text,
	"content_hash" text,
	"signer_name" text NOT NULL,
	"signer_email" text NOT NULL,
	"signer_phone" text,
	"signer_id_number_last4" text,
	"verification_level" "verification_level" NOT NULL,
	"require_tsa" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"signed_pdf_path" text,
	"signed_pdf_hash" text,
	"signature_image_path" text,
	"tsa_token_base64" text,
	"tsa_timestamp_at" timestamp with time zone,
	"tsa_provider" text,
	"crm_customer_id" text,
	"crm_order_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signing_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"event" text NOT NULL,
	"actor" "audit_actor" NOT NULL,
	"actor_id" text,
	"ip" text,
	"user_agent" text,
	"geo" jsonb,
	"data" jsonb,
	"prev_hash" text,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signing_kyc_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"id_card_front_path" text,
	"id_card_back_path" text,
	"selfie_path" text,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signing_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"channel" "otp_channel" NOT NULL,
	"target" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_audit_logs" ADD CONSTRAINT "signing_audit_logs_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_kyc_records" ADD CONSTRAINT "signing_kyc_records_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_otps" ADD CONSTRAINT "signing_otps_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_templates_type" ON "contract_templates" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contracts_signing_token" ON "contracts" USING btree ("signing_token");--> statement-breakpoint
CREATE INDEX "idx_contracts_status" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contracts_signer_email" ON "contracts" USING btree ("signer_email");--> statement-breakpoint
CREATE INDEX "idx_contracts_crm_customer" ON "contracts" USING btree ("crm_customer_id");--> statement-breakpoint
CREATE INDEX "idx_audit_contract" ON "signing_audit_logs" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "signing_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_otps_contract" ON "signing_otps" USING btree ("contract_id");