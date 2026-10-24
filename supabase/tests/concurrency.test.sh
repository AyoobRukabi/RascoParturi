#!/usr/bin/env bash
# Fire many simultaneous bookings for the very same slot; exactly one may win.
set -euo pipefail
PSQL="$1"
N=12
SLOT=$($PSQL -Atc "select (((select day from t.ctx) + time '16:30') at time zone 'Europe/Helsinki')")
BARBER=$($PSQL -Atc "select a from t.ctx"); SVC=$($PSQL -Atc "select cut from t.ctx")
rm -f /tmp/rasco_conc_*.out
for i in $(seq 1 $N); do
  ( $PSQL -Atc "select appointment_id from create_booking('$BARBER', array['$SVC'::uuid], '$SLOT', 'Racer $i', '040123456', 'racer$i@x.test', 'fi')" \
      > /tmp/rasco_conc_$i.out 2>&1 || true ) &
done
wait
WON=$(cat /tmp/rasco_conc_*.out | grep -cE '^[0-9a-f-]{36}$' || true)
LOST=$(cat /tmp/rasco_conc_*.out | grep -c 'slot_unavailable' || true)
rm -f /tmp/rasco_conc_*.out
echo "concurrent bookings: $WON succeeded, $LOST rejected (of $N)"
[ "$WON" = "1" ] && [ "$LOST" = "$((N-1))" ] || { echo "CONCURRENCY TEST FAILED"; exit 1; }
echo "ok - exactly one concurrent booking wins the slot"
