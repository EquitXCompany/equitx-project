

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."cdp_history_action_enum" AS ENUM (
    'OPEN',
    'ADD_COLLATERAL',
    'WITHDRAW_COLLATERAL',
    'BORROW_ASSET',
    'REPAY_DEBT',
    'PAY_INTEREST',
    'FREEZE',
    'LIQUIDATE'
);


ALTER TYPE "public"."cdp_history_action_enum" OWNER TO "postgres";


CREATE TYPE "public"."cdps_status_enum" AS ENUM (
    '0',
    '1',
    '2',
    '3'
);


ALTER TYPE "public"."cdps_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."last_queried_timestamps_table_type_enum" AS ENUM (
    'CDP',
    'STAKE',
    'LIQUIDATION'
);


ALTER TYPE "public"."last_queried_timestamps_table_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."staker_history_action_enum" AS ENUM (
    'STAKE',
    'UNSTAKE',
    'DEPOSIT',
    'WITHDRAW',
    'CLAIM_REWARDS'
);


ALTER TYPE "public"."staker_history_action_enum" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."asset" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "symbol" character varying(10) NOT NULL,
    "feed_address" character varying(56) NOT NULL,
    "price" numeric(30,0) NOT NULL,
    "last_xlm_price" numeric(30,0) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."asset" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cdp_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lender" character(56) NOT NULL,
    "xlm_deposited" numeric(30,0) NOT NULL,
    "asset_lent" numeric(30,0) NOT NULL,
    "xlm_delta" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "asset_delta" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "action" "public"."cdp_history_action_enum" NOT NULL,
    "original_cdp_id" "uuid" NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    "asset_id" "uuid",
    "interest_delta" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "accrued_interest" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "interest_paid" numeric(30,0) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE "public"."cdp_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cdp_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "active_cdps_count" integer NOT NULL,
    "total_xlm_locked" numeric(30,0) NOT NULL,
    "collateral_ratio" numeric(15,5) NOT NULL,
    "cdps_near_liquidation" integer NOT NULL,
    "recent_liquidations" integer NOT NULL,
    "health_score" integer NOT NULL,
    "daily_volume" numeric(30,0) NOT NULL,
    "weekly_volume" numeric(30,0) NOT NULL,
    "monthly_volume" numeric(30,0) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT "now"() NOT NULL,
    "asset_id" "uuid",
    "collateral_ratio_histogram" "jsonb",
    "total_outstanding_interest" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "total_paid_interest" numeric(30,0) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE "public"."cdp_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cdps" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lender" character(56) NOT NULL,
    "xlm_deposited" numeric(30,0) NOT NULL,
    "asset_lent" numeric(30,0) NOT NULL,
    "status" "public"."cdps_status_enum" DEFAULT '0'::"public"."cdps_status_enum" NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "asset_id" "uuid",
    "accrued_interest" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "interest_paid" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "last_interest_time" bigint DEFAULT '0'::bigint NOT NULL
);


ALTER TABLE "public"."cdps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."last_queried_timestamps" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "wasm_hash" character varying(32) NOT NULL,
    "table_type" "public"."last_queried_timestamps_table_type_enum" NOT NULL,
    "timestamp" bigint NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."last_queried_timestamps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."liquidations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "collateral_liquidated" numeric(30,0) NOT NULL,
    "principal_repaid" numeric(30,0) NOT NULL,
    "collateralization_ratio" numeric(30,0) NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    "cdp_id" "uuid",
    "asset_id" "uuid",
    "collateral_liquidated_usd" numeric(30,0) NOT NULL,
    "accrued_interest_repaid" numeric(30,0) NOT NULL,
    "collateral_applied_to_interest" numeric(30,0) NOT NULL,
    "xlm_price" numeric(30,0) NOT NULL,
    "xasset_price" numeric(30,0) NOT NULL
);


ALTER TABLE "public"."liquidations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."liquidity_pools" (
    "asset_id" "uuid" NOT NULL,
    "pool_address" character varying(56) NOT NULL,
    "minimum_collateralization_ratio" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "mercury_wasm_hash" character varying(56) NOT NULL
);


ALTER TABLE "public"."liquidity_pools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migrations" (
    "id" integer NOT NULL,
    "timestamp" bigint NOT NULL,
    "name" character varying NOT NULL
);


ALTER TABLE "public"."migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."migrations_id_seq" OWNED BY "public"."migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."price_history" (
    "id" integer NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    "price" numeric(30,0) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "is_latest" boolean DEFAULT false NOT NULL,
    "asset_id" "uuid"
);


ALTER TABLE "public"."price_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."price_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."price_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."price_history_id_seq" OWNED BY "public"."price_history"."id";



CREATE TABLE IF NOT EXISTS "public"."protocol_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "total_value_locked" numeric(30,0) NOT NULL,
    "total_debt" numeric(30,0) NOT NULL,
    "unique_users" integer NOT NULL,
    "active_cdps" integer NOT NULL,
    "system_collateralization" numeric(12,5) NOT NULL,
    "liquidation_events_24h" integer NOT NULL,
    "average_health_factor" numeric(10,5) NOT NULL,
    "daily_volume" numeric(30,0) NOT NULL,
    "user_growth_24h" numeric(15,5) NOT NULL,
    "tvl_growth_24h" numeric(15,5) NOT NULL,
    "volume_growth_24h" numeric(20,5) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT "now"() NOT NULL,
    "is_latest" boolean DEFAULT false NOT NULL,
    "total_staked" numeric(30,0) NOT NULL,
    "total_outstanding_interest" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "total_paid_interest" numeric(30,0) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE "public"."protocol_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."singletons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" character varying(255) NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "asset_id" "uuid"
);


ALTER TABLE "public"."singletons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staker_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "address" character(56) NOT NULL,
    "xasset_deposit" numeric(30,0) NOT NULL,
    "product_constant" numeric(30,0) NOT NULL,
    "compounded_constant" numeric(30,0) NOT NULL,
    "xasset_delta" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "rewards_claimed" numeric(30,0) DEFAULT '0'::numeric NOT NULL,
    "action" "public"."staker_history_action_enum" NOT NULL,
    "epoch" character varying NOT NULL,
    "original_staker_id" "uuid" NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    "asset_id" "uuid"
);


ALTER TABLE "public"."staker_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stakers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "address" character varying(56) NOT NULL,
    "xasset_deposit" numeric(30,0) NOT NULL,
    "product_constant" bigint NOT NULL,
    "compounded_constant" bigint NOT NULL,
    "epoch" numeric(10,0) NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "updated_at" timestamp without time zone NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "asset_id" "uuid",
    "total_rewards_claimed" numeric(30,0) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE "public"."stakers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tvl_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "total_xlm_locked" numeric(30,0) NOT NULL,
    "total_xassets_minted" numeric(30,0) NOT NULL,
    "active_cdps_count" integer NOT NULL,
    "tvl_usd" numeric(30,0) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT "now"() NOT NULL,
    "asset_id" "uuid",
    "total_xassets_minted_usd" numeric(30,0) NOT NULL,
    "total_xassets_staked" numeric(30,0) NOT NULL,
    "total_xassets_staked_usd" numeric(30,0) NOT NULL,
    "open_accounts" integer NOT NULL,
    "staked_share_histogram" "jsonb"
);


ALTER TABLE "public"."tvl_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "address" character varying(56) NOT NULL,
    "total_cdps" integer NOT NULL,
    "total_value_locked" numeric(30,0) NOT NULL,
    "total_debt" numeric(30,0) NOT NULL,
    "avg_collateralization_ratio" numeric(15,5) NOT NULL,
    "total_volume" numeric(30,0) NOT NULL,
    "liquidations_received" integer NOT NULL,
    "liquidations_executed" integer NOT NULL,
    "risk_score" integer NOT NULL,
    "last_activity" timestamp without time zone NOT NULL,
    "avg_position_duration" integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT "now"() NOT NULL,
    "total_accrued_interest" numeric(30,0) NOT NULL,
    "total_interest_paid" numeric(30,0) NOT NULL
);


ALTER TABLE "public"."user_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."utilization_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "daily_active_users" integer NOT NULL,
    "daily_transactions" integer NOT NULL,
    "daily_xlm_volume" numeric(30,0) NOT NULL,
    "daily_xasset_volume" numeric(30,0) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT "now"() NOT NULL,
    "asset_id" "uuid"
);


ALTER TABLE "public"."utilization_metrics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."price_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."price_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."protocol_stats"
    ADD CONSTRAINT "PK_01e3138597f447eaa59bc2bcf9c" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."liquidity_pools"
    ADD CONSTRAINT "PK_0e9c01f404f36d69a66360da963" PRIMARY KEY ("asset_id");



ALTER TABLE ONLY "public"."asset"
    ADD CONSTRAINT "PK_1209d107fe21482beaea51b745e" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."last_queried_timestamps"
    ADD CONSTRAINT "PK_2718dca04bb5fa303e63df9aa07" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."liquidations"
    ADD CONSTRAINT "PK_2beac231b5ead3f70f2f6347a08" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cdp_history"
    ADD CONSTRAINT "PK_36bec318f5ad9248b3f563500e9" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stakers"
    ADD CONSTRAINT "PK_3da4a784c61e62ade7612c317e8" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tvl_metrics"
    ADD CONSTRAINT "PK_3f24d5bbc2956cd7f62502b51c5" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."singletons"
    ADD CONSTRAINT "PK_4228e3294dfb966dc99eb20de3f" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cdps"
    ADD CONSTRAINT "PK_766b98b2c5e557794660cb1042a" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staker_history"
    ADD CONSTRAINT "PK_828313a7140ceb82ad5bbd68648" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."utilization_metrics"
    ADD CONSTRAINT "PK_93dc3941af91e57f5c4ef494c94" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_metrics"
    ADD CONSTRAINT "PK_987f8bd3fd2015b1c617b06b1cd" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cdp_metrics"
    ADD CONSTRAINT "PK_dbb8826aaf9e22a9c07be0a53c4" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_history"
    ADD CONSTRAINT "PK_e41e25472373d4b574b153229e9" PRIMARY KEY ("id");



CREATE INDEX "IDX_0dd87c935b43fe8adc1f11338b" ON "public"."staker_history" USING "btree" ("address");



CREATE INDEX "IDX_1685e49f43a80ed131890e5f27" ON "public"."tvl_metrics" USING "btree" ("timestamp");



CREATE INDEX "IDX_289db4cdf9022df4eafc0a09cf" ON "public"."price_history" USING "btree" ("timestamp");



CREATE INDEX "IDX_2a41cbf544a11add9e45fe8256" ON "public"."cdp_history" USING "btree" ("lender");



CREATE INDEX "IDX_2ac747f4ff981c1721a9704848" ON "public"."staker_history" USING "btree" ("asset_id");



CREATE INDEX "IDX_3485ea7b6ca7303962a159252a" ON "public"."price_history" USING "btree" ("is_latest");



CREATE INDEX "IDX_40eca242928cb1465111bdcee9" ON "public"."tvl_metrics" USING "btree" ("asset_id");



CREATE INDEX "IDX_429b102b19712dafefc49aa5b6" ON "public"."utilization_metrics" USING "btree" ("asset_id");



CREATE UNIQUE INDEX "IDX_45b83954906fc214e750ba5328" ON "public"."asset" USING "btree" ("symbol");



CREATE INDEX "IDX_5426ecc57791f110e10165fe7a" ON "public"."cdp_metrics" USING "btree" ("timestamp");



CREATE INDEX "IDX_567d0f033a43cd6faefa62831f" ON "public"."stakers" USING "btree" ("address");



CREATE INDEX "IDX_5f38e5c301a72e37764f66355c" ON "public"."cdps" USING "btree" ("lender");



CREATE INDEX "IDX_65537c1d67d0a37e773df926e5" ON "public"."user_metrics" USING "btree" ("timestamp");



CREATE UNIQUE INDEX "IDX_66d0177919f16b48f6a8e3d968" ON "public"."liquidity_pools" USING "btree" ("pool_address");



CREATE INDEX "IDX_715be056834a4b7de88819ad64" ON "public"."cdp_history" USING "btree" ("asset_id");



CREATE INDEX "IDX_96a84a7b00108d9cfb0e87f4e6" ON "public"."singletons" USING "btree" ("key");



CREATE INDEX "IDX_a304adc800499aad883fa0d99f" ON "public"."user_metrics" USING "btree" ("address");



CREATE INDEX "IDX_a9e225567f904e644d0b109cc5" ON "public"."protocol_stats" USING "btree" ("timestamp");



CREATE INDEX "IDX_bdb5015d1fd9f4a13e4bc27440" ON "public"."singletons" USING "btree" ("asset_id");



CREATE INDEX "IDX_c3c96255a0ac4c5f6bb9b0bf0c" ON "public"."utilization_metrics" USING "btree" ("timestamp");



CREATE INDEX "IDX_c62bf82e3d13bd8b95e6466c63" ON "public"."cdp_metrics" USING "btree" ("asset_id");



CREATE INDEX "IDX_d8c8677fcaba2dd0631ddb3d1c" ON "public"."cdps" USING "btree" ("asset_id");



ALTER TABLE ONLY "public"."liquidity_pools"
    ADD CONSTRAINT "FK_0e9c01f404f36d69a66360da963" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."staker_history"
    ADD CONSTRAINT "FK_2ac747f4ff981c1721a97048486" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."tvl_metrics"
    ADD CONSTRAINT "FK_40eca242928cb1465111bdcee92" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."utilization_metrics"
    ADD CONSTRAINT "FK_429b102b19712dafefc49aa5b61" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."liquidations"
    ADD CONSTRAINT "FK_6108b94908d9b575d47de7130f9" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."cdp_history"
    ADD CONSTRAINT "FK_715be056834a4b7de88819ad64a" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."singletons"
    ADD CONSTRAINT "FK_bdb5015d1fd9f4a13e4bc27440b" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."stakers"
    ADD CONSTRAINT "FK_c3c82793720b3a3400cfc50c7b9" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."cdp_metrics"
    ADD CONSTRAINT "FK_c62bf82e3d13bd8b95e6466c639" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."cdps"
    ADD CONSTRAINT "FK_d8c8677fcaba2dd0631ddb3d1cb" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."price_history"
    ADD CONSTRAINT "FK_db9d97d03fe07d465c3fdf6f078" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id");



ALTER TABLE ONLY "public"."liquidations"
    ADD CONSTRAINT "FK_ec5533c2bb1fd262245c02f6462" FOREIGN KEY ("cdp_id") REFERENCES "public"."cdps"("id");



ALTER TABLE "public"."asset" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cdp_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cdp_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cdps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."last_queried_timestamps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."liquidations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."liquidity_pools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."protocol_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."singletons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staker_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stakers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tvl_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."utilization_metrics" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


































































































































































GRANT ALL ON TABLE "public"."asset" TO "anon";
GRANT ALL ON TABLE "public"."asset" TO "authenticated";
GRANT ALL ON TABLE "public"."asset" TO "service_role";



GRANT ALL ON TABLE "public"."cdp_history" TO "anon";
GRANT ALL ON TABLE "public"."cdp_history" TO "authenticated";
GRANT ALL ON TABLE "public"."cdp_history" TO "service_role";



GRANT ALL ON TABLE "public"."cdp_metrics" TO "anon";
GRANT ALL ON TABLE "public"."cdp_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."cdp_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."cdps" TO "anon";
GRANT ALL ON TABLE "public"."cdps" TO "authenticated";
GRANT ALL ON TABLE "public"."cdps" TO "service_role";



GRANT ALL ON TABLE "public"."last_queried_timestamps" TO "anon";
GRANT ALL ON TABLE "public"."last_queried_timestamps" TO "authenticated";
GRANT ALL ON TABLE "public"."last_queried_timestamps" TO "service_role";



GRANT ALL ON TABLE "public"."liquidations" TO "anon";
GRANT ALL ON TABLE "public"."liquidations" TO "authenticated";
GRANT ALL ON TABLE "public"."liquidations" TO "service_role";



GRANT ALL ON TABLE "public"."liquidity_pools" TO "anon";
GRANT ALL ON TABLE "public"."liquidity_pools" TO "authenticated";
GRANT ALL ON TABLE "public"."liquidity_pools" TO "service_role";



GRANT ALL ON TABLE "public"."migrations" TO "anon";
GRANT ALL ON TABLE "public"."migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."price_history" TO "anon";
GRANT ALL ON TABLE "public"."price_history" TO "authenticated";
GRANT ALL ON TABLE "public"."price_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."price_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."price_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."price_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."protocol_stats" TO "anon";
GRANT ALL ON TABLE "public"."protocol_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."protocol_stats" TO "service_role";



GRANT ALL ON TABLE "public"."singletons" TO "anon";
GRANT ALL ON TABLE "public"."singletons" TO "authenticated";
GRANT ALL ON TABLE "public"."singletons" TO "service_role";



GRANT ALL ON TABLE "public"."staker_history" TO "anon";
GRANT ALL ON TABLE "public"."staker_history" TO "authenticated";
GRANT ALL ON TABLE "public"."staker_history" TO "service_role";



GRANT ALL ON TABLE "public"."stakers" TO "anon";
GRANT ALL ON TABLE "public"."stakers" TO "authenticated";
GRANT ALL ON TABLE "public"."stakers" TO "service_role";



GRANT ALL ON TABLE "public"."tvl_metrics" TO "anon";
GRANT ALL ON TABLE "public"."tvl_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."tvl_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."user_metrics" TO "anon";
GRANT ALL ON TABLE "public"."user_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."utilization_metrics" TO "anon";
GRANT ALL ON TABLE "public"."utilization_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."utilization_metrics" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


























RESET ALL;
