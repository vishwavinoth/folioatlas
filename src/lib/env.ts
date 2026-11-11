/**
 * Read a server environment variable, treating blank values and the literal
 * strings "null" / "undefined" (left behind by some dashboard imports) as unset.
 */
export function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value !== "null" && value !== "undefined" ? value : undefined;
}
