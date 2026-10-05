import type { APIRoute } from 'astro';
import { getSql } from '../../../server/db/client.ts';
import { adminSlots } from '../../../server/http/admin-api.ts';
import { guarded, json } from '../../../server/http/respond.ts';

export const prerender = false;

// GET /admin/api/slots/?doctorId=…&date=…&serviceId=… | &appointmentId=…  (staff only)
export const GET: APIRoute = (context) =>
  guarded('admin/slots', async () => json(await adminSlots(getSql(), context.url.searchParams, Date.now())));
