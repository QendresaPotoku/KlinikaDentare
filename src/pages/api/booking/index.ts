import type { APIRoute } from 'astro';
import { getSql } from '../../../server/db/client.ts';
import { submitBooking } from '../../../server/http/booking-api.ts';
import { guarded, json, readJson, requestContext } from '../../../server/http/respond.ts';
import { requestDispatch } from '../../../server/notifications/dispatcher.ts';

export const prerender = false;

// POST /api/booking/  (JSON body; cross-site browsers cannot send it without a CORS preflight, which is not allowed)
export const POST: APIRoute = (context) =>
  guarded('booking/submit', async () => {
    const body = await readJson(context.request);
    if (body === undefined) return json({ status: 400, body: { error: 'invalid_input' } });
    const result = await submitBooking(getSql(), body, requestContext(context));
    if (result.status < 300) requestDispatch(getSql());
    return json(result);
  });
