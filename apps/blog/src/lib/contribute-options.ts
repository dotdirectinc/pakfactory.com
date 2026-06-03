import { getCategoryFallback } from "@/lib/blog-categories";
import { HOME_CATEGORY_SLUGS } from "@/lib/blog-home";

export const CONTRIBUTE_ROLE_OPTIONS = [
  { value: "industry-expert", label: "Industry expert" },
  { value: "brand-manufacturer", label: "Brand / manufacturer" },
  { value: "agency-consultant", label: "Agency / consultant" },
  { value: "freelance-writer", label: "Freelance writer" },
  { value: "academic-researcher", label: "Academic / researcher" },
] as const;

export const CONTRIBUTE_SUBJECT_OTHER = "other" as const;

export type ContributeRoleValue = (typeof CONTRIBUTE_ROLE_OPTIONS)[number]["value"];
export type ContributeSubjectValue =
  | (typeof HOME_CATEGORY_SLUGS)[number]
  | typeof CONTRIBUTE_SUBJECT_OTHER;

export function getContributeSubjectOptions(): { value: string; label: string }[] {
  return [
    ...HOME_CATEGORY_SLUGS.map((slug) => ({
      value: slug,
      label: getCategoryFallback(slug)?.title ?? slug,
    })),
    { value: CONTRIBUTE_SUBJECT_OTHER, label: "Other" },
  ];
}

const ROLE_VALUES = new Set<string>(CONTRIBUTE_ROLE_OPTIONS.map((r) => r.value));
const SUBJECT_VALUES = new Set<string>([
  ...HOME_CATEGORY_SLUGS,
  CONTRIBUTE_SUBJECT_OTHER,
]);

export function isValidContributeRole(value: string): value is ContributeRoleValue {
  return ROLE_VALUES.has(value);
}

export function isValidContributeSubject(value: string): value is ContributeSubjectValue {
  return SUBJECT_VALUES.has(value);
}
