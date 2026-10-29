import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function nextJapaneseYear(now = new Date()) {
  return String(Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(now)) + 1);
}

export async function checkHolidayBuild(year = nextJapaneseYear(), root = process.cwd()) {
  const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
  const snapshot = await readJson('src/data/holidays.json');
  if (!snapshot.metadata.years.includes(year)) throw new Error(`翌年 ${year}年のデータが未収録です`);
  const all = await readJson('dist/api/v1/date.json');
  const metadata = await readJson('dist/api/v1/metadata.json');
  const annual = await readJson(`dist/api/v1/${year}/date.json`);
  const expected = Object.fromEntries(Object.entries(snapshot.holidays).filter(([date]) => date.startsWith(`${year}-`)));
  if (!Object.keys(expected).length || !isDeepStrictEqual(all, snapshot.holidays) || !isDeepStrictEqual(metadata, snapshot.metadata) || !isDeepStrictEqual(annual, expected)) {
    throw new Error('生成されたJSONが保存データと一致しません');
  }
  console.log(`全件・メタデータ・${year}年の生成結果を確認しました`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  checkHolidayBuild().catch(error => { console.error(error); process.exitCode = 1; });
}
