import { defineField, defineType } from "sanity";

export const staticPage = defineType({
  name: "staticPage",
  title: "Static Page",
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
      name: "body",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({ name: "seo", title: "SEO", type: "seo" }),
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare({ title, slug }) {
      return { title, subtitle: slug ? `/${slug}` : undefined };
    },
  },
});
