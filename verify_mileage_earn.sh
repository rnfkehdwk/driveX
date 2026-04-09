#!/bin/bash
# ============================================================
# 마일리지 적립 로직 검증 스크립트 v2
# ============================================================
# 사용법 (NAS에서):
#   cd /volume1/docker/drivelog
#   bash verify_mileage_earn.sh
# ============================================================

API_BASE="${API_BASE:-https://192.168.0.2:8443}"
COMPANY_CODE="1012"
LOGIN_ID="cblim"
PASSWORD="11223344"

echo "==================================================="
echo "  마일리지 적립 로직 검증 v2"
echo "  API: $API_BASE"
echo "==================================================="

# ----- [1] 로그인 -----
echo "[1] 로그인..."
LOGIN_RES=$(curl -ks -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"company_code\":\"$COMPANY_CODE\",\"login_id\":\"$LOGIN_ID\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RES" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "로그인 실패: $LOGIN_RES"
  echo ""
  echo "→ rate limit이면: sudo docker-compose restart api 후 재시도"
  exit 1
fi
echo "OK"

# ----- [2] 검증 대상 고객 선택 -----
echo ""
echo "[2] 잔액 30,000원 이상 고객 선택..."
CUSTOMERS=$(curl -ks "$API_BASE/api/mileage?has_balance=true" -H "Authorization: Bearer $TOKEN")
CUSTOMER_ID=$(echo "$CUSTOMERS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('data', data.get('items', data.get('customers', [])))
for c in items:
    if int(c.get('mileage_balance', 0) or 0) >= 30000:
        print(c.get('customer_id', c.get('id', '')))
        break
")
if [ -z "$CUSTOMER_ID" ]; then
  echo "잔액 30,000원 이상 고객 없음"
  echo "응답 샘플:"
  echo "$CUSTOMERS" | head -c 500
  exit 1
fi

BEFORE=$(curl -ks "$API_BASE/api/mileage/customer/$CUSTOMER_ID" -H "Authorization: Bearer $TOKEN")
BEFORE_BAL=$(echo "$BEFORE" | python3 -c "
import json, sys
d = json.load(sys.stdin)
candidates = [
    d.get('balance'),
    d.get('mileage_balance'),
    (d.get('customer') or {}).get('mileage_balance'),
    (d.get('data') or {}).get('balance'),
    (d.get('data') or {}).get('mileage_balance'),
    ((d.get('data') or {}).get('customer') or {}).get('mileage_balance'),
]
for v in candidates:
    if v is not None:
        print(v)
        break
else:
    print(0)
")
echo "customer_id=$CUSTOMER_ID, 사용 전 잔액=${BEFORE_BAL}원"

# ----- [3] 운행 작성 -----
echo ""
echo "[3] 운행 작성: 운임 30,000 + 마일리지 5,000 사용"
echo "    기대 적립: (30,000 - 5,000) × 10% = 2,500원"

NOW=$(date '+%Y-%m-%d %H:%M:%S')
END=$(date -d '+30 minutes' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date '+%Y-%m-%d %H:%M:%S')

RIDE_RES=$(curl -ks -X POST "$API_BASE/api/rides" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"customer_id\": $CUSTOMER_ID,
    \"started_at\": \"$NOW\",
    \"ended_at\": \"$END\",
    \"total_fare\": 30000,
    \"mileage_used\": 5000,
    \"payment_type_id\": 6,
    \"rider_memo\": \"[자동검증-마일리지적립]\"
  }")
echo "응답: $RIDE_RES"

RIDE_ID=$(echo "$RIDE_RES" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    candidates = [
        d.get('id'),
        d.get('ride_id'),
        (d.get('ride') or {}).get('id'),
        (d.get('ride') or {}).get('ride_id'),
        (d.get('data') or {}).get('id'),
        (d.get('data') or {}).get('ride_id'),
    ]
    for v in candidates:
        if v is not None:
            print(v)
            break
except: pass
")
echo "ride_id=$RIDE_ID"

# ----- [4] 거래 이력 검증 -----
echo ""
echo "[4] 사용 후 거래 이력 검증..."
AFTER=$(curl -ks "$API_BASE/api/mileage/customer/$CUSTOMER_ID" -H "Authorization: Bearer $TOKEN")
echo "$AFTER" | python3 -c "
import json, sys
d = json.load(sys.stdin)
candidates = [
    d.get('balance'),
    d.get('mileage_balance'),
    (d.get('customer') or {}).get('mileage_balance'),
    (d.get('data') or {}).get('balance'),
    (d.get('data') or {}).get('mileage_balance'),
    ((d.get('data') or {}).get('customer') or {}).get('mileage_balance'),
]
bal = next((v for v in candidates if v is not None), 0)
txs = (d.get('transactions')
       or d.get('history')
       or (d.get('data') or {}).get('transactions')
       or (d.get('data') or {}).get('history')
       or [])
print(f'  현재 잔액: {bal}원')
print(f'  최근 거래 (상위 5건):')
for t in txs[:5]:
    print(f\"    [{t.get('type')}] {t.get('amount')}원 -> balance_after={t.get('balance_after')} ({t.get('description','')})\")
"

# ----- [5] 결과 판정 + 정리 SQL -----
echo ""
echo "==================================================="
echo "  판정 기준"
echo "    EARN 2500 = 새 로직 OK (마일리지 사용분 제외 적립)"
echo "    EARN 3000 = 옛 로직 (재배포 필요)"
echo "==================================================="
echo ""
if [ -n "$RIDE_ID" ]; then
  echo "[정리 SQL — 검증 후 실행]"
  echo "  ride_id=$RIDE_ID, customer_id=$CUSTOMER_ID, before_bal=$BEFORE_BAL"
  echo ""
  cat <<EOF
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<SQL
START TRANSACTION;
DELETE FROM customer_mileage WHERE ride_id = $RIDE_ID;
UPDATE customers SET mileage_balance = $BEFORE_BAL WHERE customer_id = $CUSTOMER_ID;
DELETE FROM rides WHERE ride_id = $RIDE_ID;
COMMIT;
SELECT customer_id, name, mileage_balance FROM customers WHERE customer_id = $CUSTOMER_ID;
SQL
EOF
else
  echo "ride_id를 못 찾아 정리 SQL 생성 불가"
fi
