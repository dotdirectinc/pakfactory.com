import { defineField, defineType } from "sanity";

export const category = defineType({
  name: "category",
  title: "Category",
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
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare({ title, slug }) {
      return { title, subtitle: slug ? `/${slug}` : undefined };
    },
  },
});
