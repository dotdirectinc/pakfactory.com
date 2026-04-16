import { defineField, defineType } from "sanity";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
    }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({ name: "bio", type: "text", rows: 4 }),
  ],
});
