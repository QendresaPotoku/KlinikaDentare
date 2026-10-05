import type { APIRoute } from 'astro';
import { getSql } from '../../../server/db/client.ts';
import { bookingSlots } from '../../../server/http/booking-api.ts';
import { guarded, json, requestContext } from '../../../server/http/respond.ts';

export const prerender = false;

// GET /api/booking/slots/?serviceId=…&doctorId=…&date=YYYY-MM-DD
export const GET: APIRoute = (context) =>
  guarded('booking/slots', async () => json(await bookingSlots(getSql(), context.url.searchParams, requestContext(context))));
