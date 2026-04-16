import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: "excerpt", type: "text", rows: 3 }),
    defineField({
      name: "author",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "mainImage",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({ name: "publishedAt", type: "datetime" }),
    defineField({
      name: "body",
      type: "array",
      of: [{ type: "block" }, { type: "image", options: { hotspot: true } }],
    }),
  ],
  preview: {
    select: { title: "title", author: "author.name", media: "mainImage" },
    prepare({ title, author, media }) {
      return { title, subtitle: author ? `by ${author}` : undefined, media };
    },
  },
});
