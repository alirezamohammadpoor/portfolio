import { defineType, defineField } from "sanity";

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shortDescription",
      title: "Short Description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "fullDescription",
      title: "Full Description",
      type: "text",
      rows: 6,
    }),
    defineField({
      name: "techStack",
      title: "Tech Stack",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "siteUrl",
      title: "Site URL",
      type: "url",
    }),
    defineField({
      name: "sitePassword",
      title: "Site Password",
      description: "Optional password for Shopify dev-store gate. Shown as a copy button; user pastes it into Shopify's password prompt after clicking Visit.",
      type: "string",
    }),
    defineField({
      name: "caseStudy",
      title: "Case Study",
      type: "reference",
      to: [{ type: "journalPost" }],
    }),
    defineField({
      name: "coverMedia",
      title: "Cover Media",
      description: "Hero image or video shown on the homepage card",
      type: "object",
      fields: [
        defineField({
          name: "type",
          title: "Type",
          type: "string",
          options: { list: ["image", "video"], layout: "radio" },
          initialValue: "image",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "image",
          title: "Image",
          type: "image",
          options: { hotspot: true },
          hidden: ({ parent }) => parent?.type !== "image",
        }),
        defineField({
          name: "video",
          title: "Video",
          type: "file",
          options: { accept: "video/*" },
          hidden: ({ parent }) => parent?.type !== "video",
        }),
      ],
    }),
    defineField({
      name: "gallery",
      title: "Gallery",
      description: "Mixed images and videos shown in the project page gallery. Drag to reorder.",
      type: "array",
      of: [
        {
          type: "object",
          name: "galleryImage",
          title: "Image",
          fields: [
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { media: "image" },
            prepare: () => ({ title: "Image" }),
          },
        },
        {
          type: "object",
          name: "galleryVideo",
          title: "Video",
          fields: [
            defineField({
              name: "video",
              title: "Video",
              type: "file",
              options: { accept: "video/*" },
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            prepare: () => ({ title: "Video" }),
          },
        },
      ],
    }),
    // Deprecated — to be removed once content is migrated to `gallery`
    defineField({
      name: "images",
      title: "Gallery Images (Deprecated)",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      hidden: true,
    }),
    defineField({
      name: "videos",
      title: "Videos (Deprecated)",
      type: "array",
      of: [{ type: "file", options: { accept: "video/*" } }],
      hidden: true,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
    }),
  ],
  orderings: [
    {
      title: "Display Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", media: "coverMedia.image" },
  },
});
