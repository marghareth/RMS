// FILE: src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      /** True while an ADMIN/CAPTAIN account has not yet enabled TOTP. */
      mfaSetupRequired?: boolean;
      /** Epoch ms of the sign-in that produced this session. */
      loginAt?: number;
    };
  }

  interface User {
    id: string;
    username: string;
    role: string;
    mfaSetupRequired?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    mfaSetupRequired?: boolean;
    loginAt?: number;
    /** Epoch ms of the last time role/is_active/mfa were re-read from the DB. */
    checkedAt?: number;
    /** Set when the account was deleted or deactivated after this token was issued. */
    invalid?: boolean;
  }
}
//added comments to test