import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

export const source = 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv';
const target = fileURLToPath(new URL('../src/data/holidays.json', import.meta.url));

export function parseHolidays(bytes) {
  const csv = new TextDecoder('shift_jis', { fatal: true }).decode(bytes);
  const [header, ...rows] = parse(csv, { bom: true, skip_empty_lines: true });
  if (!header || header.length !== 2 || header[0] !== '国民の祝日・休日月日' || header[1] !== '国民の祝日・休日名称') throw new Error('CSVのヘッダーが想定と異なります');
  const entries = new Map();
  for (const row of rows) {
    if (row.length !== 2) throw new Error('CSVの列数が不正です');
    const [rawDate, rawName] = row;
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(rawDate);
    if (!match || !rawName.trim()) throw new Error(`CSVの値が不正です: ${rawDate}`);
    const [, y, m, d] = match;
    const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error(`日付が不正です: ${rawDate}`);
    if (entries.has(date)) throw new Error(`日付が重複しています: ${date}`);
    entries.set(date, rawName.trim());
  }
  if (!entries.size) throw new Error('祝日データが空です');
  return Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const response = await fetch(source, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`CSVの取得に失敗しました: HTTP ${response.status}`);
  const holidays = parseHolidays(await response.arrayBuffer());
  let previous;
  try { previous = JSON.parse(await readFile(target, 'utf8')).holidays; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const years = [...new Set(Object.keys(holidays).map(date => date.slice(0, 4)))];
  if (previous) {
    const removed = Object.keys(previous).filter(date => !(date in holidays));
    const added = Object.keys(holidays).filter(date => !(date in previous));
    const changed = Object.keys(holidays).filter(date => date in previous && holidays[date] !== previous[date]);
    console.log(`差分: 追加 ${added.length}件、削除 ${removed.length}件、名称変更 ${changed.length}件`);
    for (const date of added) console.log(`+ ${date} ${holidays[date]}`);
    for (const date of removed) console.log(`- ${date} ${previous[date]}`);
    for (const date of changed) console.log(`~ ${date} ${previous[date]} → ${holidays[date]}`);
    const missingYears = [...new Set(removed.map(date => date.slice(0, 4)))].filter(year => !years.includes(year));
    if (missingYears.length || Object.keys(holidays).length < Object.keys(previous).length * 0.9) throw new Error(`データの大幅な減少または対象年の消失を検出しました: ${missingYears.join(', ')}`);
  }
  const snapshot = { metadata: { source, fetchedAt: new Date().toISOString(), years, count: Object.keys(holidays).length }, holidays };
  await mkdir(fileURLToPath(new URL('../src/data/', import.meta.url)), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(temp, target);
  } finally { await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  console.log(`${years[0]}〜${years.at(-1)}年: ${snapshot.metadata.count}件を保存しました`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error); process.exitCode = 1; });
