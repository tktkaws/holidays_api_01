import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHolidays } from '../scripts/update-holidays.mjs';
import { readFile } from 'node:fs/promises';

// ASCII fixtures use an ASCII-compatible subset of Shift_JIS.
const encode = text => new TextEncoder().encode(text);
// Reuse the real Shift_JIS header from the source to exercise decoding.
const headerBytes = await readFile(new URL('./header.bin', import.meta.url));
const csv = rows => Buffer.concat([headerBytes, encode(`\n${rows}`)]);

test('quoted values and sorting', () => {
  assert.deepEqual(parseHolidays(csv('2026/2/1,"A,B"\n2026/1/1,New Year')), { '2026-01-01': 'New Year', '2026-02-01': 'A,B' });
});
test('rejects invalid input', () => {
  for (const rows of ['', '2026/2/30,A', '2026/1/1,', '2026/1/1,A\n2026/1/1,B', '2026/1/1,A,C']) assert.throws(() => parseHolidays(csv(rows)));
  assert.throws(() => parseHolidays(encode('wrong,header\n2026/1/1,A')));
  assert.throws(() => parseHolidays(Buffer.concat([headerBytes, Buffer.from([10, 0x81])])));
});
test('snapshot includes holidays and consistent metadata', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../src/data/holidays.json', import.meta.url), 'utf8'));
  assert.equal(snapshot.holidays['2026-05-06'], '休日');
  assert.equal(snapshot.holidays['2026-09-22'], '休日');
  assert.equal(Object.keys(snapshot.holidays).length, snapshot.metadata.count);
  assert.deepEqual([...new Set(Object.keys(snapshot.holidays).map(date => date.slice(0, 4)))], snapshot.metadata.years);
});
