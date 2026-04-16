import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "description", type: "text", rows: 2 }),
    defineField({ name: "url", type: "url" }),
  ],
});
