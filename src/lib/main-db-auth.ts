import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

import { mainDbPool } from "./main-db";

const scryptAsync = promisify(scrypt);

export type MainUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "player";
  account_status: string;
};

type MainUserWithPassword = MainUser & { password_hash: string };

export async function findMainUserByEmail(email: string): Promise<MainUserWithPassword | null> {
  const result = await mainDbPool.query<MainUserWithPassword>(
    `SELECT u.id, u.email, u.role, u.password_hash, u.account_status,
            COALESCE(p.display_name, split_part(u.email, '@', 1)) AS name
     FROM users u
     LEFT JOIN players p ON u.player_id = p.id
     WHERE u.email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findMainUserById(id: string): Promise<MainUser | null> {
  const result = await mainDbPool.query<MainUser>(
    `SELECT u.id, u.email, u.role, u.account_status,
            COALESCE(p.display_name, split_part(u.email, '@', 1)) AS name
     FROM users u
     LEFT JOIN players p ON u.player_id = p.id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function verifyMainUserPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, saltHex, hashHex] = parts;
  const expectedHash = Buffer.from(hashHex, "hex");

  try {
    // salt is stored as a hex string and used as-is (not decoded to bytes)
    const derivedKey = (await scryptAsync(password, saltHex, expectedHash.length)) as Buffer;
    return timingSafeEqual(derivedKey, expectedHash);
  } catch {
    return false;
  }
}

export function mapMainRoleToTournamentRole(role: string): "owner" | "tournament_admin" | null {
  if (role === "owner") return "owner";
  if (role === "admin") return "tournament_admin";
  return null;
}
