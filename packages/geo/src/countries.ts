import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import iso3166 from 'iso-3166-2';

countries.registerLocale(enLocale);

export type GeoOption = {
  code: string;
  label: string;
};

/** Sentinels for Select “Other…” free-text mode. */
export const GEO_OTHER = '__other__';

/** PakFactory buyer favorites — Canada then United States. */
const PINNED_COUNTRY_CODES = ['CA', 'US'] as const;

/** Short labels that differ from i18n-iso-countries “official” names. */
const LABEL_OVERRIDES: Record<string, string> = {
  US: 'United States',
};

function displayLabel(code: string, official: string): string {
  return LABEL_OVERRIDES[code] ?? official;
}

let cachedCountries: GeoOption[] | null = null;

export function listCountries(): GeoOption[] {
  if (cachedCountries) return cachedCountries;
  const names = countries.getNames('en', { select: 'official' });
  const all = Object.entries(names)
    .map(([code, label]) => ({
      code,
      label: displayLabel(code, label),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));

  const pinned: GeoOption[] = [];
  const rest: GeoOption[] = [];
  const pinnedSet = new Set<string>(PINNED_COUNTRY_CODES);

  for (const opt of all) {
    if (pinnedSet.has(opt.code)) pinned.push(opt);
    else rest.push(opt);
  }

  pinned.sort(
    (a, b) =>
      PINNED_COUNTRY_CODES.indexOf(
        a.code as (typeof PINNED_COUNTRY_CODES)[number],
      ) -
      PINNED_COUNTRY_CODES.indexOf(
        b.code as (typeof PINNED_COUNTRY_CODES)[number],
      ),
  );

  cachedCountries = [...pinned, ...rest];
  return cachedCountries;
}

export function countryLabel(code: string): string {
  const override = LABEL_OVERRIDES[code];
  if (override) return override;
  return countries.getName(code, 'en', { select: 'official' }) ?? code;
}

export function listRegions(countryCode: string): GeoOption[] {
  if (!countryCode) return [];
  const data = iso3166.country(countryCode);
  if (!data?.sub) return [];
  return Object.entries(data.sub)
    .map(([code, info]) => ({
      code,
      label: info.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

export function regionLabel(countryCode: string, regionCode: string): string {
  const sub = iso3166.subdivision(regionCode);
  if (sub?.name) return sub.name;
  const match = listRegions(countryCode).find((r) => r.code === regionCode);
  return match?.label ?? regionCode;
}

/** UI label for the region control (Province / State / Region). */
export function regionFieldLabel(countryCode: string): string {
  const regions = listRegions(countryCode);
  const first = regions[0];
  if (!first) return 'Region';
  const sample = iso3166.subdivision(first.code);
  const type = sample?.type?.trim();
  if (!type) return 'Region';
  return type;
}

export function hasRegions(countryCode: string): boolean {
  return listRegions(countryCode).length > 0;
}

/** How many leading entries from `listCountries()` are Suggested favorites. */
export const PINNED_COUNTRY_COUNT = PINNED_COUNTRY_CODES.length;
