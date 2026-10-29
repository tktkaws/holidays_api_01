import type { APIRoute } from 'astro';
import snapshot from '../../../data/holidays.json';

export const GET: APIRoute = () => new Response(JSON.stringify(snapshot.metadata, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
