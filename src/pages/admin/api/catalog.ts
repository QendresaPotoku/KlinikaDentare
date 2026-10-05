import type { APIRoute } from 'astro';
import { getSql } from '../../../server/db/client.ts';
import { adminCatalog } from '../../../server/http/admin-api.ts';
import { guarded, json } from '../../../server/http/respond.ts';

export const prerender = false;

// GET /admin/api/catalog/  (staff only)
export const GET: APIRoute = () => guarded('admin/catalog', async () => json(await adminCatalog(getSql())));
