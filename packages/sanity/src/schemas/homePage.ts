import { defineField, defineType } from "sanity";

export const homePage = defineType({
  name: "homePage",
  title: "Home Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
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
    select: { title: "title" },
    prepare({ title }) {
      return { title, subtitle: "Home (no slug)" };
    },
  },
});
