/**
 * API verification for booking timestamps / overlap / 9 AM checkout.
 * Uses free dates relative to existing seed bookings.
 * Cleans up bookings created by this script at the end.
 */
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

const createdIds = [];
const phone = `9${String(Date.now()).slice(-9)}`;
const password = 'testpass123';

console.log('1) Health');
const health = await req('GET', '/api/health');
assert(health.status === 200, `health ${health.status}`);
console.log('   OK', health.json.message);

console.log('2) Register temp customer');
const reg = await req('POST', '/api/auth/register', {
  name: 'Timestamp Tester',
  phone,
  email: `${phone}@example.com`,
  password,
  role: 'customer',
});
assert(reg.status === 201, `register ${reg.status} ${reg.json.message}`);
const customerToken = reg.json.data.token;
console.log('   OK customer id', reg.json.data.user.id);

const props = await req('GET', '/api/properties');
const propertyId = props.json.data?.[0]?.id;
assert(propertyId, 'no property');
const price = Number(props.json.data[0].price_per_day);

console.log('3) Overlap with existing booking #1 (19→20) expect 409');
const overlap = await req(
  'POST',
  '/api/bookings',
  { property_id: propertyId, check_in: '2026-09-19', check_out: '2026-09-20' },
  customerToken
);
assert(overlap.status === 409, `overlap expected 409 got ${overlap.status}`);
console.log('   OK blocked');

console.log('4) Mid-stay overlap (19→21 spanning #1) expect 409');
const mid = await req(
  'POST',
  '/api/bookings',
  { property_id: propertyId, check_in: '2026-09-19', check_out: '2026-09-21' },
  customerToken
);
assert(mid.status === 409, `mid expected 409 got ${mid.status}`);
console.log('   OK blocked');

console.log('5) Adjacent after #4 ends 21 Sep 9 AM → book 21→22 (expect 201)');
const adjacent = await req(
  'POST',
  '/api/bookings',
  { property_id: propertyId, check_in: '2026-09-21', check_out: '2026-09-22' },
  customerToken
);
assert(adjacent.status === 201, `adjacent ${adjacent.status} ${adjacent.json.message}`);
const bAdj = adjacent.json.data;
createdIds.push(bAdj.id);
assert(bAdj.check_in === '2026-09-21T10:00:00+05:30', `check_in ${bAdj.check_in}`);
assert(bAdj.check_out === '2026-09-22T09:00:00+05:30', `check_out ${bAdj.check_out}`);
assert(bAdj.total_nights === 1, `nights ${bAdj.total_nights}`);
assert(Number(bAdj.total_amount) === Number((price * 1).toFixed(2)), 'amount 1n');
console.log('   OK', bAdj.check_in, '→', bAdj.check_out);

console.log('6) 2 nights free window 24→26');
const two = await req(
  'POST',
  '/api/bookings',
  { property_id: propertyId, check_in: '2026-09-24', check_out: '2026-09-26' },
  customerToken
);
assert(two.status === 201, `two ${two.status} ${two.json.message}`);
createdIds.push(two.json.data.id);
assert(two.json.data.total_nights === 2, `nights ${two.json.data.total_nights}`);
assert(two.json.data.check_in === '2026-09-24T10:00:00+05:30', 'check_in 2n');
assert(two.json.data.check_out === '2026-09-26T09:00:00+05:30', 'check_out 2n');
assert(
  Number(two.json.data.total_amount) === Number((price * 2).toFixed(2)),
  'amount 2n'
);
console.log('   OK nights', two.json.data.total_nights, 'amount', two.json.data.total_amount);

console.log('7) 3 nights 26→29 (adjacent after previous checkout 9 AM)');
const three = await req(
  'POST',
  '/api/bookings',
  { property_id: propertyId, check_in: '2026-09-26', check_out: '2026-09-29' },
  customerToken
);
assert(three.status === 201, `three ${three.status} ${three.json.message}`);
createdIds.push(three.json.data.id);
assert(three.json.data.total_nights === 3, `nights ${three.json.data.total_nights}`);
assert(three.json.data.check_out === '2026-09-29T09:00:00+05:30', 'check_out 3n');
assert(
  Number(three.json.data.total_amount) === Number((price * 3).toFixed(2)),
  'amount 3n'
);
console.log('   OK nights', three.json.data.total_nights);

console.log('8) Reject datetime input');
const bad = await req(
  'POST',
  '/api/bookings',
  {
    property_id: propertyId,
    check_in: '2026-10-10T15:00:00',
    check_out: '2026-10-11T15:00:00',
  },
  customerToken
);
assert(bad.status === 400, `bad time ${bad.status}`);
console.log('   OK', bad.json.message);

console.log('9) Cancel adjacent booking and rebook same dates');
const cancel = await req(
  'PATCH',
  `/api/bookings/${bAdj.id}/cancel`,
  null,
  customerToken
);
assert(cancel.status === 200, `cancel ${cancel.status}`);
const rebook = await req(
  'POST',
  '/api/bookings',
  { property_id: propertyId, check_in: '2026-09-21', check_out: '2026-09-22' },
  customerToken
);
assert(rebook.status === 201, `rebook ${rebook.status} ${rebook.json.message}`);
createdIds.push(rebook.json.data.id);
console.log('   OK cancelled no longer blocks');

console.log('10) My bookings timestamps (check-in 10:00, check-out 09:00)');
const mine = await req('GET', '/api/bookings/my', null, customerToken);
assert(mine.status === 200, 'my bookings');
for (const b of mine.json.data) {
  assert(
    typeof b.check_in === 'string' && b.check_in.includes('T10:00:00+05:30'),
    `bad check_in ${b.check_in}`
  );
  assert(
    typeof b.check_out === 'string' && b.check_out.includes('T09:00:00+05:30'),
    `bad check_out ${b.check_out}`
  );
}
console.log('   OK', mine.json.data.length, 'bookings');

console.log('11) Cleanup created bookings');
for (const id of createdIds) {
  await req('PATCH', `/api/bookings/${id}/cancel`, null, customerToken);
}
console.log('   OK cancelled', createdIds.length);

console.log('\nALL_API_TESTS_PASSED');
