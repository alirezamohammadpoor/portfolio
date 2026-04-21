import { defineType, defineField } from "sanity";

export const journalPage = defineType({
  name: "journalPage",
  title: "Journal Page",
  type: "document",
  fields: [
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    prepare: () => ({ title: "Journal Page" }),
  },
});
