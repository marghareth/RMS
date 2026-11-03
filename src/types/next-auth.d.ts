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
      /** True while the account is on a temporary or admin-chosen password. */
      mustChangePassword?: boolean;
      /** Epoch ms of the password change this session signed in after. */
      pwdAt?: number;
    };
  }

  interface User {
    id: string;
    username: string;
    role: string;
    mfaSetupRequired?: boolean;
    mustChangePassword?: boolean;
    pwdAt?: number;
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
    /** Set when the account was deleted, deactivated or had its password changed after this token was issued. */
    invalid?: boolean;
    /** True while the account must choose a new password before using the app. */
    mustChangePassword?: boolean;
    /** Epoch ms of the account's password_changed_at when this token was issued. */
    pwdAt?: number;
  }
}
//added comments to test