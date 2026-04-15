-- ============================================================
-- 변경이력 로그 테이블 및 트리거
-- ============================================================

-- ── 변경이력 테이블 생성 ──
CREATE TABLE IF NOT EXISTS activity_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       TEXT        NOT NULL,   -- 'status_change' | 're_upload' | 'new_upload'
  order_no         TEXT,
  product_name     TEXT,
  manager_code     TEXT,
  old_value        TEXT,                   -- 이전 상태/값
  new_value        TEXT,                   -- 새 상태/값
  note             TEXT,                   -- 부가 메모
  upload_history_id UUID       REFERENCES upload_history(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 인덱스 ──
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at   ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_order_no     ON activity_log(order_no);
CREATE INDEX IF NOT EXISTS idx_activity_log_manager_code ON activity_log(manager_code);
CREATE INDEX IF NOT EXISTS idx_activity_log_event_type   ON activity_log(event_type);

-- ── RLS ──
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_read_all"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "activity_log_service_write"
  ON activity_log FOR ALL
  TO service_role
  USING (true);

-- ── update_item_status 함수 업데이트: activity_log에도 기록 ──
CREATE OR REPLACE FUNCTION update_item_status(
  p_item_id    UUID,
  p_new_status TEXT
) RETURNS VOID AS $$
DECLARE
  v_item       order_items%ROWTYPE;
  v_order      orders%ROWTYPE;
  v_change     TEXT;
  v_now        TEXT;
BEGIN
  SELECT * INTO v_item FROM order_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '아이템을 찾을 수 없습니다: %', p_item_id; END IF;
  IF v_item.status = p_new_status THEN RETURN; END IF;

  SELECT * INTO v_order FROM orders WHERE id = v_item.order_id;

  v_now    := TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI');
  v_change := '[' || v_now || '] 상태: ' || v_item.status || ' → ' || p_new_status;

  -- order_items 업데이트
  UPDATE order_items SET
    status         = p_new_status,
    status_history = COALESCE(status_history, v_item.status) || ' → ' || p_new_status,
    change_log     = CASE
                       WHEN change_log IS NULL THEN v_change
                       ELSE change_log || E'\n' || v_change
                     END,
    updated_at     = NOW()
  WHERE id = p_item_id;

  -- activity_log 기록
  INSERT INTO activity_log (
    event_type, order_no, product_name, manager_code, old_value, new_value, note
  ) VALUES (
    'status_change',
    v_order.order_no,
    v_item.product_name,
    v_order.manager_code,
    v_item.status,
    p_new_status,
    v_change
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
