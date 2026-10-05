import type { APIRoute } from 'astro';
import { getSql } from '../../../server/db/client.ts';
import { bookingOptions, parseLang } from '../../../server/http/booking-api.ts';
import { guarded, json, requestContext } from '../../../server/http/respond.ts';

export const prerender = false;

// GET /api/booking/options/?lang=sq
export const GET: APIRoute = (context) =>
  guarded('booking/options', async () =>
    json(await bookingOptions(getSql(), parseLang(context.url.searchParams.get('lang')), requestContext(context))),
  );
