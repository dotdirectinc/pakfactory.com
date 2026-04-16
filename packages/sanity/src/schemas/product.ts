import { defineArrayMember, defineField, defineType, type SanityDocument } from "sanity";

const landingPageRefTypes = [
  { type: "capabilityPage" as const },
  { type: "productPage" as const },
  { type: "staticPage" as const },
];

export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  groups: [
    { name: "default", title: "Default", default: true },
    { name: "categoryDetail", title: "Category Detail" },
    { name: "additionalInfo", title: "Additional Information" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    // ── Default ──────────────────────────────────────────────────────────────
    defineField({
      name: "title",
      type: "string",
      group: "default",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "array",
      of: [{ type: "block" }],
      group: "default",
    }),
    defineField({
      name: "media",
      title: "Media",
      type: "array",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
            }),
          ],
        }),
      ],
      group: "default",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Google product taxonomy category.",
      options: {
        list: [
          { title: "Bags & Cases", value: "166" },
          { title: "Business & Industrial > Packaging", value: "111" },
          { title: "Apparel & Accessories", value: "1" },
          { title: "Apparel & Accessories > Clothing", value: "1604" },
          { title: "Health & Beauty > Personal Care", value: "469" },
          { title: "Food, Beverages & Tobacco", value: "422" },
          { title: "Home & Garden", value: "536" },
          { title: "Arts & Entertainment > Hobbies", value: "8" },
          { title: "Office Supplies", value: "922" },
          { title: "Sporting Goods", value: "990" },
        ],
        layout: "dropdown",
      },
      group: "default",
    }),
    defineField({
      name: "primaryLandingPage",
      title: "Landing Page",
      type: "reference",
      to: [...landingPageRefTypes],
      description: "Which solution type does this product live under?",
      validation: (r) => r.required(),
      group: "default",
    }),
    defineField({
      name: "primaryCollection",
      title: "Style Collection",
      type: "reference",
      to: [{ type: "productCollection" }],
      description: "URL segment after the landing page — the collection this product belongs to.",
      validation: (r) => r.required(),
      options: {
        filter: ({ document }: { document: SanityDocument }) => {
          const landingPageRef = (document?.primaryLandingPage as { _ref?: string } | undefined)?._ref;
          if (!landingPageRef) return {};
          return {
            filter: "landingPage._ref == $landingPageId || !defined(landingPage)",
            params: { landingPageId: landingPageRef },
          };
        },
      },
      group: "default",
    }),
    defineField({
      name: "template",
      title: "Template",
      type: "string",
      description: "Next.js page template to use for this product.",
      options: {
        list: [
          { title: "Default", value: "default" },
          { title: "Custom", value: "custom" },
          { title: "Premium", value: "premium" },
        ],
        layout: "dropdown",
      },
      group: "default",
    }),
    defineField({
      name: "handle",
      type: "slug",
      description:
        "Last segment of the canonical product URL: /products/{page}/{collection}/{handle}",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
      group: "default",
    }),

    // ── Category Detail ───────────────────────────────────────────────────────
    defineField({
      name: "structureComplexity",
      title: "Structure Complexity",
      type: "number",
      group: "categoryDetail",
    }),
    defineField({
      name: "moq",
      title: "Product MOQ",
      type: "string",
      description: "Minimum order quantity",
      group: "categoryDetail",
    }),
    defineField({
      name: "dimensions",
      title: "Dimensions",
      type: "string",
      group: "categoryDetail",
    }),
    defineField({
      name: "leadTime",
      title: "Lead Time",
      type: "string",
      group: "categoryDetail",
    }),
    defineField({
      name: "materialOptions",
      title: "Material Options",
      type: "string",
      group: "categoryDetail",
    }),

    // ── Additional Information ────────────────────────────────────────────────
    defineField({
      name: "cardName",
      title: "Card Name",
      type: "string",
      group: "additionalInfo",
    }),
    defineField({
      name: "cardDescription",
      title: "Card Description",
      type: "text",
      rows: 3,
      group: "additionalInfo",
    }),

    // ── SEO ──────────────────────────────────────────────────────────────────
    defineField({ name: "seo", title: "SEO", type: "seo", group: "seo" }),
  ],
  preview: {
    select: {
      title: "title",
      handle: "handle.current",
      media: "media.0.asset",
    },
    prepare({ title, handle, media }) {
      return {
        title: title ?? undefined,
        subtitle: handle ? `/${handle}` : undefined,
        media,
      };
    },
  },
});
