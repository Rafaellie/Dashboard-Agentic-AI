-- ============================================================
--  AGENTIC BI DASHBOARD — DATABASE MIGRATION v2.0
--  Single Tenant | D'BESTO / PT. Evalinda Berkah Mandiri
--  Target DB : Supabase PostgreSQL
--  Generated : 2026-06-09
--  Author    : Agentic Strategy AI
-- ============================================================
-- PETUNJUK EKSEKUSI:
--   1. Jalankan SECTION 1-8 di Supabase SQL Editor
--   2. Verifikasi COUNT pada SECTION 6 sebelum DROP
--   3. SECTION 6b (DROP) & SECTION 7 dijalankan terpisah setelah
--      LangGraph checkpointer dikonfigurasi dan ditest
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- SECTION 1 │ EXTENSION (pastikan tersedia)
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- SECTION 2 │ ALTER TABLE profiles
--             Tambah: role, telegram_id, branch_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'kasir'
    CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'manager', 'kasir', 'csuite')),

  ADD COLUMN IF NOT EXISTS telegram_id TEXT
    CONSTRAINT profiles_telegram_id_unique UNIQUE,

  ADD COLUMN IF NOT EXISTS branch_id UUID
    CONSTRAINT profiles_branch_id_fkey
    REFERENCES public.retail_branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.role IS
  'Hak akses user: '
  'admin  = superuser HQ (full CRUD + config), '
  'manager = kepala outlet (read ops + pivot), '
  'kasir  = bot Telegram POS only, '
  'csuite = strategic report + read-only';

COMMENT ON COLUMN public.profiles.telegram_id IS
  'Telegram user_id (integer as string) dari kasir. '
  'Digunakan bot POS untuk lookup branch context kasir. '
  'Wajib diisi untuk role=kasir.';

COMMENT ON COLUMN public.profiles.branch_id IS
  'Outlet yang di-assign ke user ini (kasir / manager). '
  'NULL untuk admin dan csuite yang akses semua branch.';

-- ─────────────────────────────────────────────────────────────
-- SECTION 3 │ ALTER TABLE retail_branches
--             Tambah: region, city, address, phone, is_active
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.retail_branches
  ADD COLUMN IF NOT EXISTS region    TEXT,
  ADD COLUMN IF NOT EXISTS city      TEXT,
  ADD COLUMN IF NOT EXISTS address   TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.retail_branches.owner_id IS
  'Manager / PIC yang bertanggung jawab atas branch ini (FK → profiles).';

COMMENT ON COLUMN public.retail_branches.region IS
  'Pengelompokan regional untuk BI: Jawa Barat, Sulawesi, Kalimantan, dll.';

COMMENT ON COLUMN public.retail_branches.city IS
  'Kota untuk drill-down BI: Bandung, Makassar, Palangkaraya, dll.';

COMMENT ON COLUMN public.retail_branches.is_active IS
  'false = branch tutup / non-aktif. Filter default di semua BI query.';

-- ─────────────────────────────────────────────────────────────
-- SECTION 4 │ ALTER TABLE fact_transactions
--             Tambah : source, kasir_id
--             Tambah constraints yang kurang
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.fact_transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CONSTRAINT fact_trx_source_check
    CHECK (source IN ('telegram', 'csv_import', 'manual')),

  ADD COLUMN IF NOT EXISTS kasir_id UUID
    CONSTRAINT fact_trx_kasir_id_fkey
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Guard constraints yang sebelumnya tidak ada
ALTER TABLE public.fact_transactions
  DROP CONSTRAINT IF EXISTS fact_trx_payment_status_check;

ALTER TABLE public.fact_transactions
  ADD CONSTRAINT fact_trx_payment_status_check
    CHECK (payment_status IN ('paid', 'pending', 'cancelled', 'refunded'));

ALTER TABLE public.fact_transactions
  DROP CONSTRAINT IF EXISTS fact_trx_sales_channel_check;

ALTER TABLE public.fact_transactions
  ADD CONSTRAINT fact_trx_sales_channel_check
    CHECK (sales_channel IN (
      'telegram', 'gofood', 'grabfood',
      'dine_in', 'takeaway', 'manual'
    ));

COMMENT ON COLUMN public.fact_transactions.source IS
  'Asal data masuk: '
  'telegram   = transaksi real-time dari Telegram POS bot, '
  'csv_import = upload file CSV / Excel dari fitur Data Integration, '
  'manual     = entry langsung oleh HQ / admin.';

COMMENT ON COLUMN public.fact_transactions.kasir_id IS
  'FK → profiles.id. '
  'Diisi otomatis ketika source=telegram berdasarkan telegram_id lookup.';

-- ─────────────────────────────────────────────────────────────
-- SECTION 5a │ CREATE TABLE saved_views  (BARU)
--              Untuk fitur Save View & Memory History Pivot
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_views (
  id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_by  UUID        NOT NULL,
  view_name   TEXT        NOT NULL,
  department  TEXT,
  description TEXT,
  config      JSONB       NOT NULL DEFAULT '{}',
                -- format: {
                --   grouping:       [string],
                --   columns_state:  {field: bool},
                --   values_state:   {field: aggregation},
                --   filters_state:  [{field, op, value}],
                --   sort_state:     {field, dir}
                -- }
  scope       TEXT        NOT NULL DEFAULT 'personal'
                CONSTRAINT saved_views_scope_check
                CHECK (scope IN ('personal', 'shared')),
  is_pinned   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT saved_views_pkey
    PRIMARY KEY (id),
  CONSTRAINT saved_views_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.saved_views IS
  'Konfigurasi Smart Pivot Explorer yang disimpan per user. '
  'scope=personal hanya terlihat oleh created_by, '
  'scope=shared terlihat semua user dalam sistem.';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saved_views_updated_at ON public.saved_views;

CREATE TRIGGER trg_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- SECTION 5b │ CREATE TABLE strategic_reports  (BARU)
--              Untuk fitur Memory History (Strategic AI)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.strategic_reports (
  id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_by       UUID        NOT NULL,
  title            TEXT,
  report_markdown  TEXT,                 -- output Generation node
  analysis_json    JSONB,                -- output Reasoning node (structured)
  deviations_json  JSONB,                -- deviasi vs periode sebelumnya
  kpis_snapshot    JSONB,                -- snapshot KPI saat laporan dibuat
  period_start     DATE,
  period_end       DATE,
  model_used       TEXT DEFAULT 'groq/llama-3.3-70b',
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT strategic_reports_pkey
    PRIMARY KEY (id),
  CONSTRAINT strategic_reports_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.strategic_reports IS
  'Riwayat laporan AI Strategic yang di-generate LangGraph. '
  'Digunakan oleh fitur Memory History di halaman Strategic BI.';

COMMENT ON COLUMN public.strategic_reports.kpis_snapshot IS
  'Snapshot KPI (revenue, margin, waste, dll) pada saat laporan dibuat. '
  'Digunakan untuk perbandingan trend historis antar laporan.';

COMMENT ON COLUMN public.strategic_reports.analysis_json IS
  'Output terstruktur dari Reasoning Node: '
  '{strengths, weaknesses, opportunities, threats, priorities, risks}';

-- ─────────────────────────────────────────────────────────────
-- SECTION 6a │ MIGRATE data sales_orders → fact_transactions
--              Jalankan SEBELUM DROP tabel
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.fact_transactions (
  owner_id,
  branch_id,
  transaction_id,
  date,
  product_name,
  sku_variant,
  category,
  qty_sold,
  price_per_unit,
  total_sales,
  sales_channel,
  payment_status,
  source,
  kasir_id,
  created_at
)
SELECT
  p.id                                              AS owner_id,
  p.branch_id                                       AS branch_id,
  'MIGR-TG-' || so.id::TEXT                         AS transaction_id,
  so.timestamp                                      AS date,
  COALESCE(dp.product_name, 'Unknown Product')      AS product_name,
  so.sku_id                                         AS sku_variant,
  COALESCE(dp.category,     'Uncategorized')        AS category,
  so.quantity                                       AS qty_sold,
  CASE
    WHEN so.quantity > 0 THEN so.total_price / so.quantity
    ELSE 0
  END                                               AS price_per_unit,
  COALESCE(so.total_price, 0)                       AS total_sales,
  'telegram'                                        AS sales_channel,
  'paid'                                            AS payment_status,
  'telegram'                                        AS source,
  p.id                                              AS kasir_id,
  so.timestamp                                      AS created_at
FROM public.sales_orders so
LEFT JOIN public.profiles p ON p.telegram_id = so.telegram_id
LEFT JOIN public.dim_products dp ON dp.sku_id = so.sku_id
-- idempoten: jangan insert ulang jika sudah ada
WHERE NOT EXISTS (
  SELECT 1
  FROM   public.fact_transactions ft
  WHERE  ft.transaction_id = 'MIGR-TG-' || so.id::TEXT
);

-- ─────────────────────────────────────────────────────────────
-- SECTION 6b │ VERIFIKASI lalu DROP tabel lama
--              Uncomment HANYA setelah COUNT cocok
-- ─────────────────────────────────────────────────────────────

-- -- Cek 1: harus sama
-- SELECT COUNT(*) AS total_sales_orders  FROM public.sales_orders;
-- SELECT COUNT(*) AS migrated_rows
--   FROM public.fact_transactions
--   WHERE transaction_id LIKE 'MIGR-TG-%';
--
-- -- Jika cocok, lanjutkan:
-- DROP TABLE IF EXISTS public.sales_orders;

-- ─────────────────────────────────────────────────────────────
-- SECTION 7 │ DROP ai_conversation_state
--             Digantikan oleh tabel native LangGraph PostgresSaver:
--             checkpoints, checkpoint_blobs, checkpoint_writes
--             (auto-created saat pertama kali invoke graph)
-- ─────────────────────────────────────────────────────────────

-- -- Uncomment setelah LangGraph PostgresSaver dikonfigurasi & ditest:
-- DROP TABLE IF EXISTS public.ai_conversation_state;

-- ─────────────────────────────────────────────────────────────
-- SECTION 8 │ INDEXES untuk performa BI query
-- ─────────────────────────────────────────────────────────────

-- fact_transactions
CREATE INDEX IF NOT EXISTS idx_ft_date
  ON public.fact_transactions (date DESC);

CREATE INDEX IF NOT EXISTS idx_ft_branch_date
  ON public.fact_transactions (branch_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ft_source
  ON public.fact_transactions (source);

CREATE INDEX IF NOT EXISTS idx_ft_category
  ON public.fact_transactions (category);

CREATE INDEX IF NOT EXISTS idx_ft_channel
  ON public.fact_transactions (sales_channel);

CREATE INDEX IF NOT EXISTS idx_ft_kasir
  ON public.fact_transactions (kasir_id)
  WHERE kasir_id IS NOT NULL;

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id
  ON public.profiles (telegram_id)
  WHERE telegram_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

-- saved_views
CREATE INDEX IF NOT EXISTS idx_sv_created_by_scope
  ON public.saved_views (created_by, scope);

CREATE INDEX IF NOT EXISTS idx_sv_pinned
  ON public.saved_views (is_pinned)
  WHERE is_pinned = true;

-- strategic_reports
CREATE INDEX IF NOT EXISTS idx_sr_created_by_generated
  ON public.strategic_reports (created_by, generated_at DESC);

-- fact_inventory_daily
CREATE INDEX IF NOT EXISTS idx_fid_branch_date
  ON public.fact_inventory_daily (branch_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_fid_material
  ON public.fact_inventory_daily (material_id);

-- ─────────────────────────────────────────────────────────────
-- SECTION 9 │ HELPER VIEWS
-- ─────────────────────────────────────────────────────────────

-- VIEW 1: Dipakai Telegram bot untuk resolve telegram_id → branch context
CREATE OR REPLACE VIEW public.v_kasir_context AS
SELECT
  p.id              AS kasir_id,
  p.telegram_id,
  p.full_name       AS kasir_name,
  p.branch_id,
  rb.name           AS branch_name,
  rb.region,
  rb.city,
  rb.address,
  rb.is_active      AS branch_active
FROM  public.profiles p
LEFT  JOIN public.retail_branches rb ON rb.id = p.branch_id
WHERE p.role        = 'kasir'
  AND p.telegram_id IS NOT NULL;

COMMENT ON VIEW public.v_kasir_context IS
  'Lookup telegram_id → branch context. '
  'Dipakai endpoint /save-bulk-order sebelum INSERT ke fact_transactions.';

-- VIEW 2: Agregat harian untuk Operational Dashboard & Pivot Explorer
CREATE OR REPLACE VIEW public.v_daily_kpi AS
SELECT
  date_trunc('day', ft.date)::DATE  AS trx_date,
  ft.branch_id,
  rb.name                           AS branch_name,
  rb.region,
  rb.city,
  ft.source,
  ft.sales_channel,
  ft.category,
  COUNT(*)                          AS total_trx,
  SUM(ft.qty_sold)                  AS total_qty,
  SUM(ft.total_sales)               AS revenue,
  SUM(COALESCE(ft.cogs_total,    0))AS total_cogs,
  SUM(ft.total_sales)
    - SUM(COALESCE(ft.cogs_total,   0))
    - SUM(COALESCE(ft.platform_fee, 0))
                                    AS net_profit,
  ROUND(
    CASE WHEN SUM(ft.total_sales) > 0
      THEN (SUM(ft.total_sales)
            - SUM(COALESCE(ft.cogs_total,   0))
            - SUM(COALESCE(ft.platform_fee, 0))
           ) / SUM(ft.total_sales) * 100
      ELSE 0
    END, 2
  )                                 AS margin_pct,
  SUM(COALESCE(ft.waste_qty,      0))AS total_waste,
  SUM(COALESCE(ft.platform_fee,   0))AS total_platform_fee,
  SUM(COALESCE(ft.shipping_cost,  0))AS total_shipping_cost
FROM  public.fact_transactions  ft
LEFT  JOIN public.retail_branches rb ON rb.id = ft.branch_id
GROUP BY 1,2,3,4,5,6,7,8;

COMMENT ON VIEW public.v_daily_kpi IS
  'Agregat harian per branch × channel × category. '
  'Digunakan Operational Dashboard, Smart Pivot Explorer, dan '
  'Preprocessing Node pada LangGraph strategic agent.';

COMMIT;
