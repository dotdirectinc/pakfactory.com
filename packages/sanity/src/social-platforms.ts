export type SocialPlatform =
  | "linkedin"
  | "website"
  | "instagram"
  | "x"
  | "pinterest"
  | "snapchat"
  | "discord"
  | "facebook"
  | "youtube";

export type SocialPlatformContext = "author" | "footer";

export type SocialPlatformOption = {
  value: SocialPlatform;
  title: string;
  /** `/logos/social/*.svg` — omit for `website` (Globe icon on the blog). */
  iconSrc?: string;
  contexts: SocialPlatformContext[];
};

export const SOCIAL_PLATFORM_OPTIONS: SocialPlatformOption[] = [
  {
    value: "linkedin",
    title: "LinkedIn",
    iconSrc: "/logos/social/linkedin.svg",
    contexts: ["author", "footer"],
  },
  {
    value: "website",
    title: "Personal Website",
    contexts: ["author"],
  },
  {
    value: "instagram",
    title: "Instagram",
    iconSrc: "/logos/social/instagram.svg",
    contexts: ["author", "footer"],
  },
  {
    value: "x",
    title: "X",
    iconSrc: "/logos/social/x.svg",
    contexts: ["author", "footer"],
  },
  {
    value: "pinterest",
    title: "Pinterest",
    iconSrc: "/logos/social/pinterest.svg",
    contexts: ["author", "footer"],
  },
  {
    value: "snapchat",
    title: "Snapchat",
    iconSrc: "/logos/social/snapchat.svg",
    contexts: ["author"],
  },
  {
    value: "discord",
    title: "Discord",
    iconSrc: "/logos/social/discord.svg",
    contexts: ["author"],
  },
  {
    value: "facebook",
    title: "Facebook",
    iconSrc: "/logos/social/facebook.svg",
    contexts: ["footer"],
  },
  {
    value: "youtube",
    title: "YouTube",
    iconSrc: "/logos/social/youtube.svg",
    contexts: ["footer"],
  },
];

const PLATFORM_BY_VALUE = new Map(
  SOCIAL_PLATFORM_OPTIONS.map((option) => [option.value, option]),
);

export function socialPlatformOptionsFor(
  context: SocialPlatformContext,
): SocialPlatformOption[] {
  return SOCIAL_PLATFORM_OPTIONS.filter((option) =>
    option.contexts.includes(context),
  );
}

export function authorSocialPlatformOptions(): SocialPlatformOption[] {
  return socialPlatformOptionsFor("author");
}

export function footerSocialPlatformOptions(): SocialPlatformOption[] {
  return socialPlatformOptionsFor("footer");
}

export function socialPlatformTitle(value: SocialPlatform | string): string {
  return PLATFORM_BY_VALUE.get(value as SocialPlatform)?.title ?? "Social link";
}

export function socialPlatformIconSrc(
  value: SocialPlatform | string,
): string | undefined {
  return PLATFORM_BY_VALUE.get(value as SocialPlatform)?.iconSrc;
}

export function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORM_BY_VALUE.has(value as SocialPlatform);
}

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
  label?: string;
};

export type FooterSocialPlatform = Extract<
  SocialPlatform,
  "instagram" | "facebook" | "linkedin" | "youtube" | "pinterest" | "x"
>;

export type AuthorSocialPlatform = Extract<
  SocialPlatform,
  | "linkedin"
  | "website"
  | "instagram"
  | "x"
  | "pinterest"
  | "snapchat"
  | "discord"
>;
