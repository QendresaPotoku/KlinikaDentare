import postgres from 'postgres';
import { config } from '../config.ts';

export type Sql = postgres.Sql<Record<string, never>>;
/** Anything that can run a query: the pool or an open transaction. */
export type Db = postgres.ISql<Record<string, never>>;

/**
 * Creates a connection pool. Column names are converted between snake_case (database) and
 * camelCase (TypeScript). Sessions run in UTC so no server-side time zone setting can shift values;
 * conversion to Kosovo time happens explicitly in the application.
 */
export function createSql(url: string, options: { max?: number } = {}): Sql {
  return postgres(url, {
    max: options.max ?? 10,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
    connection: { TimeZone: 'UTC', application_name: 'klinika-booking' },
    onnotice: () => {},
  }) as unknown as Sql;
}

// One pool per server process. Kept on globalThis so dev-server reloads don't open new pools.
const globalForDb = globalThis as typeof globalThis & { __klinikaSql?: Sql };

export function getSql(): Sql {
  globalForDb.__klinikaSql ??= createSql(config.databaseUrl);
  return globalForDb.__klinikaSql;
}
