import { createHash, randomBytes, timingSafeEqual } from "crypto";

const HASH_SEPARATOR = ":";

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = hashWithSalt(password, salt);
  return `${salt}${HASH_SEPARATOR}${hash}`;
}

export function verifyAdminPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(HASH_SEPARATOR);

  if (!salt || !hash) {
    return false;
  }

  const candidate = hashWithSalt(password, salt);
  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");

  return hashBuffer.length === candidateBuffer.length && timingSafeEqual(hashBuffer, candidateBuffer);
}

function hashWithSalt(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}
