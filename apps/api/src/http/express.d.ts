import type { PublicUser } from '@kaizen/contracts';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth: {
        user: PublicUser;
        session: { tokenHash: string; token: string };
      } | null;
    }
  }
}
