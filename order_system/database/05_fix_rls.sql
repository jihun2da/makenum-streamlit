-- ============================================================
-- RLS 보완 패치 - buyer_consignor_counters, completed_order_numbers
-- 실행 시점: 기존 SQL 이후 추가 실행
-- ============================================================

-- ── buyer_consignor_counters RLS ──
ALTER TABLE buyer_consignor_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bcc_read_authenticated"
  ON buyer_consignor_counters FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "bcc_service_all"
  ON buyer_consignor_counters FOR ALL
  TO service_role USING (true);

-- ── completed_order_numbers RLS ──
ALTER TABLE completed_order_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "con_read_authenticated"
  ON completed_order_numbers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "con_service_all"
  ON completed_order_numbers FOR ALL
  TO service_role USING (true);

-- ── consignors RLS ──
ALTER TABLE consignors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consignors_read_authenticated"
  ON consignors FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "consignors_service_all"
  ON consignors FOR ALL
  TO service_role USING (true);

-- ── buyers RLS ──
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers_read_authenticated"
  ON buyers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "buyers_service_all"
  ON buyers FOR ALL
  TO service_role USING (true);

-- ── generate_order_no 함수 실행 권한 (service_role) ──
GRANT EXECUTE ON FUNCTION generate_order_no(TEXT, DATE, UUID, UUID, BOOLEAN, INTEGER, INTEGER)
  TO service_role;

GRANT EXECUTE ON FUNCTION get_or_create_base_number(UUID, UUID, TEXT)
  TO service_role;

GRANT EXECUTE ON FUNCTION get_or_create_buyer(TEXT, TEXT, TEXT)
  TO service_role;

GRANT EXECUTE ON FUNCTION get_or_create_consignor(TEXT)
  TO service_role;

GRANT EXECUTE ON FUNCTION get_or_create_manager(TEXT)
  TO service_role;
