/**
 * Shared validation for Studio `relativePath` (linkType: path).
 * Root-relative only — staging and production use the current host.
 */
export function validateRelativeSitePath(
  value: unknown,
  {required}: {required: boolean},
): true | string {
  if (!required) return true
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return 'Site path is required.'
  if (/^https?:\/\//i.test(raw)) {
    return 'Do not include a domain. Use a path like /products.'
  }
  if (!raw.startsWith('/')) {
    return 'Path must start with / (e.g. /products).'
  }
  return true
}
