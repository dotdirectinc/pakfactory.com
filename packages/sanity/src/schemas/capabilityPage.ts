import { defineArrayMember, defineField, defineType } from "sanity";

const categoryRef = (kind: "material" | "finish", title: string) =>
  defineField({
    name: kind === "material" ? "materials" : "finishes",
    title,
    type: "array",
    of: [
      defineArrayMember({
        type: "reference",
        to: [{ type: "capabilityCategory" }],
        options: {
          filter: '_type == "capabilityCategory" && category == $category',
          filterParams: { category: kind },
        },
      }),
    ],
  });

export const capabilityPage = defineType({
  name: "capabilityPage",
  title: "Capability Page",
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
    defineField({
      name: "relatedLibrary",
      title: "Related capability library",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "capabilityLibrary" }],
        }),
      ],
    }),
    defineField({
      name: "relatedCollections",
      title: "Related collections",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "productCollection" }],
        }),
      ],
    }),
    defineField({
      name: "featuredProducts",
      title: "Featured products",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "product" }],
        }),
      ],
    }),
    categoryRef("material", "Materials"),
    categoryRef("finish", "Finishes"),
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare({ title, slug }) {
      return { title, subtitle: slug ? `/${slug}` : undefined };
    },
  },
});
