import { createHash, randomBytes, createHmac } from "node:crypto";

export function sha256(input: string | Buffer | Uint8Array): string {
  const hash = createHash("sha256");
  hash.update(input as Buffer);
  return hash.digest("hex");
}

export function randomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hmacSha256(key: string, input: string): string {
  return createHmac("sha256", key).update(input).digest("hex");
}

export function generateNumericCode(length = 6): string {
  const buf = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += (buf[i] % 10).toString();
  }
  return code;
}
