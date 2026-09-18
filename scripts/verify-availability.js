import dotenv from 'dotenv';
dotenv.config();

const BASE = `http://localhost:${process.env.PORT || 5000}`;

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const props = await req('GET', '/api/properties');
const propertyId = props.json.data?.[0]?.id;
assert(propertyId, 'no property');

console.log('Property', propertyId);

async function check(checkIn, checkOut) {
  const r = await req(
    'GET',
    `/api/properties/${propertyId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`
  );
  assert(r.status === 200, `status ${r.status} ${JSON.stringify(r.json)}`);
  return r.json.data;
}

// Existing booking #1: 19 Sep 10:00 → 20 Sep 09:00 (confirmed)
const t1 = await check('2026-09-19', '2026-09-20');
assert(t1.available === false, 'TEST1 fail');
assert(Array.isArray(t1.suggestedDates), 'suggestedDates missing');
console.log('TEST1 19→20 unavailable OK, suggestions', t1.suggestedDates.length);

// Booking #4 occupies 20→21; after migration ends 21 Sep 09:00
const t2blocked = await check('2026-09-20', '2026-09-21');
assert(t2blocked.available === false, 'TEST2a fail — 20→21 should be blocked by #4');
console.log('TEST2a 20→21 unavailable OK');

// Adjacent after #4 checkout 9 AM → next check-in 10 AM same day
const t2 = await check('2026-09-21', '2026-09-22');
assert(t2.available === true, 'TEST2 fail');
assert(t2.checkIn === '2026-09-21T10:00:00+05:30', 't2 checkIn');
assert(t2.checkOut === '2026-09-22T09:00:00+05:30', `t2 checkOut ${t2.checkOut}`);
assert(t2.totalNights === 1, 't2 nights');
console.log('TEST2 21→22 available OK', t2.totalAmount);

const t3 = await check('2026-09-18', '2026-09-20');
assert(t3.available === false, 'TEST3 fail');
console.log('TEST3 18→20 unavailable OK');

// 2-night request must return 2-night suggestions
const t4 = await check('2026-09-19', '2026-09-21');
assert(t4.available === false, 'TEST4 available fail');
assert(t4.suggestedDates.length > 0, 'TEST4 no suggestions');
for (const s of t4.suggestedDates) {
  assert(s.totalNights === 2, `suggestion nights ${s.totalNights}`);
  const [y1, m1, d1] = s.checkIn.split('-').map(Number);
  const [y2, m2, d2] = s.checkOut.split('-').map(Number);
  const nights =
    (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000;
  assert(nights === 2, `date span ${nights} for ${s.checkIn}→${s.checkOut}`);
}
console.log(
  'TEST4 2-night suggestions OK',
  t4.suggestedDates.map((s) => `${s.checkIn}→${s.checkOut}`).join(', ')
);

// Availability timestamps must match booking create convention
const t5 = await check('2026-10-10', '2026-10-12');
assert(t5.available === true, 'TEST5 fail');
assert(t5.totalNights === 2, 'TEST5 nights');
assert(t5.checkIn === '2026-10-10T10:00:00+05:30', 'TEST5 in');
assert(t5.checkOut === '2026-10-12T09:00:00+05:30', 'TEST5 out');
console.log('TEST5 free 2-night window OK');

console.log('ALL_AVAILABILITY_TESTS_PASSED');
