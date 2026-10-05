import type { APIRoute } from 'astro';
import { getSql } from '../../../../../server/db/client.ts';
import { adminReschedule } from '../../../../../server/http/admin-api.ts';
import { guarded, json, readJson } from '../../../../../server/http/respond.ts';
import { requestDispatch } from '../../../../../server/notifications/dispatcher.ts';

export const prerender = false;

// POST /admin/api/appointments/{id}/reschedule/  (staff only)
export const POST: APIRoute = (context) =>
  guarded('admin/reschedule', async () => {
    const body = await readJson(context.request);
    if (body === undefined) return json({ status: 400, body: { error: 'invalid_input' } });
    const result = await adminReschedule(getSql(), context.params.id ?? '', body, { userId: context.locals.staff!.id }, Date.now());
    if (result.status < 300) requestDispatch(getSql());
    return json(result);
  });
