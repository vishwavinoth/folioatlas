import { createHash } from "node:crypto";

/** Server-only SHA-1 helper (node:crypto is unavailable in browser bundles). */
export function sha1HexNode(input: string): string {
  return createHash("sha1").update(input, "utf8").digest("hex");
}
