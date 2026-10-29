import type { APIRoute, GetStaticPaths } from 'astro';
import snapshot from '../../../../data/holidays.json';

export const getStaticPaths: GetStaticPaths = () => snapshot.metadata.years.map(year => ({ params: { year } }));
export const GET: APIRoute = ({ params }) => {
  const holidays = Object.fromEntries(Object.entries(snapshot.holidays).filter(([date]) => date.startsWith(`${params.year}-`)));
  return new Response(JSON.stringify(holidays, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
