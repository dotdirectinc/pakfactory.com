/**
 * A registry TypeID (`opt_01kwmd5800fs3se7cfny9vx8w9`) → its UUID. The same decoding as the backend's
 * scripts/lib/entity-id.mjs `parseTypeid`: Crockford base32, 26 characters, 128 bits.
 */
const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";
const TYPEID = /^([a-z]{3})_([0-7][0-9a-hjkmnp-tv-z]{25})$/;

export function typeidToUuid(s: string | undefined | null): { kind: string; uuid: string } | null {
  const m = TYPEID.exec(s ?? "");
  if (!m) return null;
  let n = 0n;
  for (const c of m[2]!) n = (n << 5n) | BigInt(CROCKFORD.indexOf(c));
  const hex = n.toString(16).padStart(32, "0");
  return { kind: m[1]!, uuid: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` };
}
