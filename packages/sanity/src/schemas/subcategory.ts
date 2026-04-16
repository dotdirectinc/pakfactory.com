import { defineField, defineType } from "sanity";

export const subcategory = defineType({
  name: "subcategory",
  title: "Subcategory",
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
    defineField({
      name: "category",
      title: "Parent category",
      type: "reference",
      to: [{ type: "category" }],
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { title: "title", slug: "slug.current", categoryTitle: "category.title" },
    prepare({ title, slug, categoryTitle }) {
      return {
        title,
        subtitle: [categoryTitle, slug && `/${slug}`].filter(Boolean).join(" · "),
      };
    },
  },
});
