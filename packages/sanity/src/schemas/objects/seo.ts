import { defineField, defineType } from "sanity";

export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta title",
      type: "string",
      validation: (r) => r.max(60),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta description",
      type: "text",
      rows: 4,
      validation: (r) => r.max(160),
    }),
    defineField({
      name: "ogImage",
      title: "OG image",
      type: "image",
      options: { hotspot: true },
    }),
  ],
});
