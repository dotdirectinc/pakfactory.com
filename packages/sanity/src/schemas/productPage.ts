import { defineArrayMember, defineField, defineType } from "sanity";

export const productPage = defineType({
  name: "productPage",
  title: "Product Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: "heroHeadline", title: "Hero headline", type: "string" }),
    defineField({
      name: "solutionType",
      title: "Solution type",
      type: "string",
      options: {
        list: [
          { title: "Standard", value: "standard" },
          { title: "Industry", value: "industry" },
        ],
        layout: "radio",
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "standardBody",
      title: "Standard solution content",
      type: "array",
      of: [{ type: "block" }],
      hidden: ({ document }) => document?.solutionType !== "standard",
    }),
    defineField({
      name: "industryBody",
      title: "Industry solution content",
      type: "array",
      of: [{ type: "block" }],
      hidden: ({ document }) => document?.solutionType !== "industry",
    }),
    defineField({
      name: "body",
      title: "Main body",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "relatedCollections",
      title: "Related collections",
      description:
        "Collections to feature on this page. Optional image per row (for cards and listings on this page only).",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "relatedCollectionItem",
          fields: [
            defineField({
              name: "collection",
              title: "Collection",
              type: "reference",
              to: [{ type: "productCollection" }],
              validation: (r) => r.required(),
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: {
              title: "collection.title",
              subtitle: "collection.slug.current",
              media: "image",
            },
            prepare({ title, subtitle, media }) {
              return {
                title: title || "Collection",
                subtitle: subtitle ? `/${subtitle}` : undefined,
                media,
              };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "includeCollectionsFromProducts",
      title: "Also include collections from products on this page",
      type: "boolean",
      description:
        "When enabled, merges in each product’s collection for products that use this landing page, after the related collections above, deduped.",
      initialValue: false,
    }),
    defineField({ name: "seo", title: "SEO", type: "seo" }),
  ],
  preview: {
    select: { title: "title", slug: "slug.current", solutionType: "solutionType" },
    prepare({ title, slug, solutionType }) {
      return {
        title,
        subtitle: [solutionType, slug && `/${slug}`].filter(Boolean).join(" · "),
      };
    },
  },
});
