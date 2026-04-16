import { defineArrayMember, defineField, defineType } from "sanity";

export const productCollection = defineType({
  name: "productCollection",
  title: "Product collection",
  type: "document",
  groups: [
    { name: "defaults", title: "Defaults", default: true },
    { name: "capabilities", title: "Capabilities" },
    { name: "landing", title: "Landing Page" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "defaults",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "defaults",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "landingPage",
      title: "Landing page",
      type: "reference",
      group: "capabilities",
      to: [
        { type: "capabilityPage" as const },
        { type: "productPage" as const },
        { type: "staticPage" as const },
      ],
      description:
        "Optional: tag this collection to a landing page so it appears in the filtered picker on products. Leave blank to make it globally available.",
    }),
    defineField({
      name: "defaultCapabilities",
      title: "Default capabilities",
      type: "array",
      group: "capabilities",
      description:
        "Optional: capabilities typical for products in this collection. Merge with per-product capabilities when rendering.",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "capabilityLibrary" }],
        }),
      ],
    }),
    defineField({
      name: "hero",
      title: "Hero",
      type: "object",
      group: "landing",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "title",
          title: "Title",
          type: "string",
          description: "Small label above the headline (e.g. badge on the collection page hero).",
        }),
        defineField({
          name: "headline",
          title: "Headline",
          type: "string",
          description: "Main hero heading when set; otherwise the default animated headline is used.",
        }),
        defineField({
          name: "description",
          title: "Description",
          type: "text",
          rows: 4,
          description: "Supporting copy below the headline on the collection page hero.",
        }),
        defineField({
          name: "image",
          title: "Image",
          type: "image",
          options: { hotspot: true },
          description: "Hero visual and default source for collection card images when banner image is not set.",
          fields: [
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "bannerImage",
      title: "Banner image",
      type: "image",
      group: "landing",
      options: { hotspot: true },
      description:
        "Optional override for product-line collection cards and the collection page hero image. If empty, Hero image is used.",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      slug: "slug.current",
      heroImage: "hero.image",
      bannerImage: "bannerImage",
    },
    prepare({ title, slug, heroImage, bannerImage }) {
      return {
        title,
        subtitle: slug ? `/${slug}` : undefined,
        media: heroImage ?? bannerImage,
      };
    },
  },
});
