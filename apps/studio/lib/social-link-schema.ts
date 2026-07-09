import { defineArrayMember, defineField, defineType } from "sanity";
import type { Rule } from "sanity";
import {
  authorSocialPlatformOptions,
  footerSocialPlatformOptions,
  socialPlatformTitle,
  type SocialPlatformContext,
  type SocialPlatformOption,
} from "@pakfactory/sanity/social-platforms";

const SOCIAL_PLATFORM_OPTIONS_FOR_SCHEMA = [
  ...authorSocialPlatformOptions(),
  ...footerSocialPlatformOptions(),
].filter(
  (option, index, all) =>
    all.findIndex((item) => item.value === option.value) === index,
);

function platformList(options: SocialPlatformOption[]) {
  return options.map((option) => ({
    title: option.title,
    value: option.value,
  }));
}

function uniquePlatformArrayValidation(context: SocialPlatformContext) {
  return (Rule: Rule) =>
    Rule.custom((links) => {
      if (!Array.isArray(links)) return true;

      const allowed = new Set(
        (context === "author"
          ? authorSocialPlatformOptions()
          : footerSocialPlatformOptions()
        ).map((option) => option.value),
      );

      const platforms = links
        .map((link) => (link as { platform?: string })?.platform)
        .filter(Boolean);

      for (const platform of platforms) {
        if (!allowed.has(platform as never)) {
          return `"${socialPlatformTitle(platform!)}" is not available in this context.`;
        }
      }

      const unique = new Set(platforms);
      if (unique.size !== platforms.length) {
        return "Each social platform can only appear once.";
      }

      if (context === "author") {
        for (const link of links) {
          const row = link as { platform?: string; label?: string };
          if (row.platform && !row.label?.trim()) {
            return "Each author social link needs a display label.";
          }
        }

        const hasLinkedIn = links.some(
          (link) => (link as { platform?: string })?.platform === "linkedin",
        );
        if (!hasLinkedIn) {
          return "At least one LinkedIn profile link is required.";
        }
      }

      return true;
    });
}

export const socialLink = defineType({
  name: "socialLink",
  title: "Social link",
  type: "object",
  fields: [
    defineField({
      name: "platform",
      title: "Platform",
      type: "string",
      options: {
        list: platformList(SOCIAL_PLATFORM_OPTIONS_FOR_SCHEMA),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "label",
      title: "Display label",
      type: "string",
      description:
        "Shown next to the icon on the author profile (e.g. author name for LinkedIn, domain for a personal site).",
    }),
  ],
  preview: {
    select: { platform: "platform", url: "url", label: "label" },
    prepare({ platform, url, label }) {
      const title = label?.trim() || socialPlatformTitle(platform ?? "");
      return { title, subtitle: url ?? "No URL" };
    },
  },
});

export function socialLinkArrayMember(context: SocialPlatformContext) {
  return defineArrayMember({
    type: "socialLink",
    name: context === "footer" ? "footerSocialLink" : "authorSocialLink",
  });
}

export function socialLinksField(options: {
  name?: string;
  title?: string;
  description?: string;
  context: SocialPlatformContext;
  group?: string;
}) {
  const {
    name = "socialLinks",
    title = "Social profiles",
    description,
    context,
    group,
  } = options;

  return defineField({
    name,
    title,
    type: "array",
    group,
    description:
      description ??
      (context === "author"
        ? "Add profile links by platform. The icon is chosen automatically; provide the URL and display label."
        : "Social profile icons shown in the footer bottom bar. When empty, the blog falls back to built-in defaults."),
    of: [socialLinkArrayMember(context)],
    validation: uniquePlatformArrayValidation(context),
  });
}
