CREATE TYPE "public"."address_type" AS ENUM('home', 'work', 'other');--> statement-breakpoint
CREATE TYPE "public"."admin_action_type" AS ENUM('seller_approved', 'seller_rejected', 'seller_suspended', 'seller_activated', 'product_approved', 'product_rejected', 'product_featured', 'product_unfeatured', 'order_status_changed', 'refund_approved', 'refund_rejected', 'user_suspended', 'user_activated', 'admin_created', 'settings_changed');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('manufacturer', 'distributor', 'wholesaler', 'retailer', 'importer', 'exporter', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('registration', 'login', 'reset_password', 'verify_phone');--> statement-breakpoint
CREATE TYPE "public"."otp_type" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TYPE "public"."payment_method_type" AS ENUM('card', 'bank_account', 'upi', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."product_condition" AS ENUM('new', 'used', 'refurbished');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."refund_request_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."type_of_buyer" AS ENUM('individual', 'business', 'government', 'reseller', 'manufacturer', 'distributor', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('customer', 'vendor', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."vendor_onboarding_status" AS ENUM('pending', 'in_progress', 'pending_verification', 'under_review', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "addresses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"label" text NOT NULL,
	"address_type" "address_type" DEFAULT 'home' NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_action_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_action_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"admin_id" varchar NOT NULL,
	"action_type" "admin_action_type" NOT NULL,
	"target_type" text NOT NULL,
	"target_id" varchar NOT NULL,
	"previous_value" text,
	"new_value" text,
	"note" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"device_label" text,
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cart_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" varchar NOT NULL,
	"product_id" integer NOT NULL,
	"vendor_id" varchar,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_status_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" varchar NOT NULL,
	"status" "order_status" NOT NULL,
	"changed_by" varchar,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"tracking_number" text,
	"estimated_delivery" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "otp_verifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"identifier" text NOT NULL,
	"code" text NOT NULL,
	"type" "otp_type" NOT NULL,
	"purpose" "otp_purpose" DEFAULT 'registration' NOT NULL,
	"user_id" varchar,
	"attempts" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "platform_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_media_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"is_cover" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_pricing_tiers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_pricing_tiers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer,
	"price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_review_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_review_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"admin_id" varchar(36) NOT NULL,
	"message" text NOT NULL,
	"requires_changes" boolean DEFAULT false,
	"is_visible_to_seller" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vendor_id" varchar NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"name" text,
	"sku" text,
	"main_category_id" integer,
	"category_id" integer,
	"sub_category_id" integer,
	"vehicle_compatibility" text,
	"certifications" text,
	"country_of_origin" text,
	"controlled_item_type" text,
	"dimension_length" numeric(10, 2),
	"dimension_width" numeric(10, 2),
	"dimension_height" numeric(10, 2),
	"dimension_unit" text,
	"materials" text[],
	"features" text[],
	"performance" text[],
	"technical_description" text,
	"drive_types" text[],
	"sizes" text[],
	"thickness" text[],
	"colors" text[],
	"weight_value" numeric(10, 2),
	"weight_unit" text,
	"packing_length" numeric(10, 2),
	"packing_width" numeric(10, 2),
	"packing_height" numeric(10, 2),
	"packing_dimension_unit" text,
	"packing_weight" numeric(10, 2),
	"packing_weight_unit" text,
	"min_order_quantity" integer,
	"base_price" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"pricing_terms" text[],
	"production_lead_time" integer,
	"ready_stock_available" boolean DEFAULT false,
	"stock" integer DEFAULT 0,
	"manufacturing_source" text,
	"manufacturing_source_name" text,
	"requires_export_license" boolean DEFAULT false,
	"has_warranty" boolean DEFAULT false,
	"warranty_duration" integer,
	"warranty_duration_unit" text,
	"warranty_terms" text,
	"compliance_confirmed" boolean DEFAULT false,
	"supplier_signature" text,
	"submission_date" timestamp,
	"price" numeric(10, 2),
	"original_price" numeric(10, 2),
	"image" text,
	"gallery" text[],
	"description" text,
	"condition" "product_condition" DEFAULT 'new',
	"make" text,
	"model" text,
	"year" integer,
	"rating" numeric(2, 1),
	"review_count" integer DEFAULT 0,
	"specifications" text,
	"vehicle_fitment" text,
	"warranty" text,
	"action_type" text DEFAULT 'buy_now',
	"is_featured" boolean DEFAULT false,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_note" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ref_controlled_item_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_controlled_item_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_controlled_item_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_countries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_countries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"flag" text,
	"phone_code" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ref_currencies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_currencies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ref_dimension_units" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_dimension_units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_dimension_units_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_drive_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_drive_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_drive_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_end_use_markets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_end_use_markets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_end_use_markets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_financial_institutions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_financial_institutions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"country_code" text NOT NULL,
	"swift_code" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "ref_license_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_license_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_license_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_manufacturing_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_manufacturing_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_manufacturing_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_nature_of_business" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_nature_of_business_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_nature_of_business_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_payment_methods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_payment_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"icon" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_payment_methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_pricing_terms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_pricing_terms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_pricing_terms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ref_product_colors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_product_colors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"hex_code" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_product_colors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_product_features" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_product_features_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_product_features_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_product_materials" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_product_materials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_product_materials_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_product_performance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_product_performance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_product_performance_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_product_sizes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_product_sizes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_product_sizes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_product_thickness" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_product_thickness_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_product_thickness_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_proof_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_proof_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_proof_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_vendor_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_vendor_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"is_controlled" boolean DEFAULT false,
	"control_note" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_vendor_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_verification_methods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_verification_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"is_available" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_verification_methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ref_weight_units" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref_weight_units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "ref_weight_units_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "refund_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refund_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"refund_id" varchar NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"vendor_id" varchar,
	"status" "refund_status" DEFAULT 'processing' NOT NULL,
	"request_status" "refund_request_status" DEFAULT 'pending',
	"amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"customer_note" text,
	"payment_method" text DEFAULT 'Tamara' NOT NULL,
	"trigger_date" timestamp DEFAULT now() NOT NULL,
	"estimated_credit_date" timestamp,
	"completed_at" timestamp,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"admin_note" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"verified_purchase" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_payment_methods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "saved_payment_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"payment_method_type" "payment_method_type" NOT NULL,
	"last_four_digits" text,
	"card_brand" text,
	"expiry_month" integer,
	"expiry_year" integer,
	"cardholder_name" text,
	"masked_account_number" text,
	"bank_name" text,
	"masked_upi_id" text,
	"processor_token" text NOT NULL,
	"processor_name" text DEFAULT 'stripe' NOT NULL,
	"billing_address_id" integer,
	"country" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"has_rbi_consent" boolean DEFAULT false,
	"consent_timestamp" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"assigned_to_id" varchar,
	"subject" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_attachments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"message_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ticket_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"type_of_buyer" "type_of_buyer",
	"compliance_registration" text,
	"country" text,
	"company_name" text,
	"company_email" text,
	"company_phone" text,
	"company_phone_country_code" text,
	"country_of_registration" text,
	"registered_company_name" text,
	"trade_brand_name" text,
	"year_of_establishment" integer,
	"legal_entity_id" text,
	"legal_entity_issue_date" text,
	"legal_entity_expiry_date" text,
	"city_office_address" text,
	"official_website" text,
	"entity_type" "entity_type",
	"duns_number" text,
	"vat_certificate_url" text,
	"tax_vat_number" text,
	"tax_issuing_date" text,
	"tax_expiry_date" text,
	"contact_full_name" text,
	"contact_job_title" text,
	"contact_work_email" text,
	"contact_id_document_url" text,
	"contact_mobile" text,
	"contact_mobile_country_code" text,
	"terms_accepted" boolean DEFAULT false,
	"terms_accepted_at" timestamp,
	"nature_of_business" text[],
	"controlled_dual_use_items" text,
	"license_types" text[],
	"end_use_markets" text[],
	"operating_countries" text[],
	"is_on_sanctions_list" boolean DEFAULT false,
	"business_license_url" text,
	"defense_approval_url" text,
	"company_profile_url" text,
	"compliance_terms_accepted" boolean DEFAULT false,
	"compliance_terms_accepted_at" timestamp,
	"selling_categories" text[],
	"register_as" text DEFAULT 'Verified Supplier',
	"preferred_currency" text,
	"sponsor_content" boolean DEFAULT false,
	"payment_method" text,
	"bank_country" text,
	"financial_institution" text,
	"swift_code" text,
	"bank_account_number" text,
	"proof_type" text,
	"bank_proof_url" text,
	"commission_percent" numeric(5, 2),
	"verification_method" text,
	"submitted_for_approval" boolean DEFAULT false,
	"submitted_at" timestamp,
	"onboarding_status" "vendor_onboarding_status" DEFAULT 'pending',
	"current_step" integer DEFAULT 1,
	"completed_at" timestamp,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_note" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"phone" text,
	"country_code" text,
	"password" text,
	"firebase_uid" text,
	"user_type" "user_type" DEFAULT 'customer' NOT NULL,
	"avatar" text,
	"email_verified" boolean DEFAULT false,
	"phone_verified" boolean DEFAULT false,
	"completion_percentage" integer DEFAULT 0,
	"token_version" integer DEFAULT 0,
	"onboarding_step" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"suspended_at" timestamp,
	"suspended_by" varchar,
	"suspended_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "vendor_notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vendor_notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vendor_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"order_id" varchar,
	"product_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pricing_tiers" ADD CONSTRAINT "product_pricing_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review_notes" ADD CONSTRAINT "product_review_notes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review_notes" ADD CONSTRAINT "product_review_notes_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_main_category_id_categories_id_fk" FOREIGN KEY ("main_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sub_category_id_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_refunds_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_billing_address_id_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ticket_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_notifications" ADD CONSTRAINT "vendor_notifications_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_notifications" ADD CONSTRAINT "vendor_notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_notifications" ADD CONSTRAINT "vendor_notifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;