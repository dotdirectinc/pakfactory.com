import { defineArrayMember, defineField, defineType } from "sanity";

export const capabilityCategory = defineType({
  name: "capabilityCategory",
  title: "Capability category",
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
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Material", value: "material" },
          { title: "Finish", value: "finish" },
        ],
        layout: "radio",
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "gallery",
      title: "Gallery",
      type: "array",
      description: "Up to 3 images: first is the hero, next two fill the side collage.",
      validation: (r) => r.max(3),
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({ name: "alt", title: "Alt text", type: "string" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "landingPages",
      title: "Landing pages",
      type: "array",
      of: [{ type: "reference", to: [{ type: "productPage" }] }],
    }),
    defineField({
      name: "collections",
      title: "Collections",
      type: "array",
      of: [{ type: "reference", to: [{ type: "productCollection" }] }],
    }),
  ],
  preview: {
    select: { title: "title", category: "category", slug: "slug.current" },
    prepare({ title, category, slug }) {
      return {
        title,
        subtitle: [category, slug && `/${slug}`].filter(Boolean).join(" · "),
      };
    },
  },
});
