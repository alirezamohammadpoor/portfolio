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
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (rule) =>
                      rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
                  }),
                ],
              },
              {
                name: "glossary",
                title: "Glossary Term",
                type: "object",
                icon: () => "💡",
                fields: [
                  defineField({
                    name: "explanation",
                    title: "ELI5 Explanation",
                    type: "text",
                    rows: 2,
                    description:
                      "Simple explanation a non-technical person would understand",
                    validation: (rule) => rule.required(),
                  }),
                ],
              },
              {
                name: "richPreview",
                title: "Rich Preview",
                type: "object",
                icon: () => "🎬",
                fields: [
                  defineField({
                    name: "videoUrl",
                    title: "Video URL",
                    type: "url",
                    description:
                      "Direct URL to video file. Leave empty if using an image.",
                  }),
                  defineField({
                    name: "image",
                    title: "Image",
                    type: "image",
                    options: { hotspot: true },
                    description:
                      "Image to show in the preview. Used if no video URL is provided.",
                  }),
                  defineField({
                    name: "url",
                    title: "Link URL",
                    type: "url",
                    description: "Where 'See more →' links to",
                  }),
                  defineField({
                    name: "label",
                    title: "Label",
                    type: "string",
                    description:
                      "Optional label above the preview (e.g. 'FKA twigs × Gentle Monster')",
                  }),
                ],
              },
            ],
          },
        },
        { type: "image", options: { hotspot: true } },
      ],
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
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      description:
        "Overrides for search engines and social sharing. If empty, falls back to the project title, short description and cover media.",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: "title",
          title: "SEO Title",
          type: "string",
          description:
            "Defaults to the project title. Keep under 60 characters.",
          validation: (rule) => rule.max(60),
        }),
        defineField({
          name: "description",
          title: "SEO Description",
          type: "text",
          rows: 3,
          description:
            "Defaults to the project short description. Keep under 160 characters.",
          validation: (rule) => rule.max(160),
        }),
        defineField({
          name: "ogImage",
          title: "Open Graph Image",
          type: "image",
          description:
            "Optional. If empty, the auto-generated OG image is used.",
          options: { hotspot: true },
        }),
        defineField({
          name: "noIndex",
          title: "Hide from search engines",
          type: "boolean",
          description:
            "If enabled, the page is excluded via robots meta tag.",
          initialValue: false,
        }),
      ],
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
