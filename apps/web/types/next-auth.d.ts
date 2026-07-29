import { DefaultSession } from 'next-auth';

// Augments next-auth's Session type with the accessToken set in auth.ts's
// session() callback — without this, `session.accessToken` doesn't
// type-check anywhere it's used (lib/get-current-account.ts, etc.).
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    scopes?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    scopes?: string[];
  }
}
