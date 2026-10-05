import type { APIRoute } from 'astro';
import { getSql } from '../../../server/db/client.ts';
import { bookingDates } from '../../../server/http/booking-api.ts';
import { guarded, json, requestContext } from '../../../server/http/respond.ts';

export const prerender = false;

// GET /api/booking/dates/?serviceId=…&doctorId=…&from=YYYY-MM-DD&to=YYYY-MM-DD
export const GET: APIRoute = (context) =>
  guarded('booking/dates', async () => json(await bookingDates(getSql(), context.url.searchParams, requestContext(context))));
