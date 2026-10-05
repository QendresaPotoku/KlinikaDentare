declare namespace App {
  interface Locals {
    /** Signed-in staff member (set by src/middleware.ts for /admin requests). */
    staff?: import('./server/auth/session.ts').StaffUser;
  }
}
