/** Tokens supported by Blog Settings meta title/description format strings. */
export type FormatTokens = {
  title?: string | null;
  name?: string | null;
  job_title?: string | null;
  excerpt?: string | null;
  description?: string | null;
  shortBio?: string | null;
  sitename?: string | null;
};

const TOKEN_PATTERN =
  /%(title|name|job_title|excerpt|description|shortBio|sitename)%/g;

/** Replace `%token%` placeholders in a Blog Settings format string. */
export function resolveFormatString(
  format: string,
  tokens: FormatTokens,
): string {
  const resolved = format.replace(TOKEN_PATTERN, (_, key: string) => {
    const value = tokens[key as keyof FormatTokens];
    return typeof value === "string" ? value.trim() : "";
  });
  return resolved.replace(/\s{2,}/g, " ").trim();
}
