import { defineType, defineField } from "sanity";

export const journalPost = defineType({
  name: "journalPost",
  title: "Journal Post",
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
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "body",
      title: "Body",
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
                      "Direct URL to video file (Sanity media library, YouTube, etc.). Leave empty if using an image.",
                  }),
                  defineField({
                    name: "image",
                    title: "Image",
                    type: "image",
                    options: { hotspot: true },
                    description: "Image to show in the preview. Used if no video URL is provided.",
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
        {
          type: "object",
          name: "quote",
          title: "Quote",
          icon: () => "❝",
          fields: [
            defineField({
              name: "text",
              title: "Quote Text",
              type: "array",
              validation: (rule) => rule.required(),
              of: [
                {
                  type: "block",
                  styles: [{ title: "Normal", value: "normal" }],
                  lists: [],
                  marks: {
                    decorators: [
                      { title: "Italic", value: "em" },
                      { title: "Bold", value: "strong" },
                    ],
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
                              "Direct URL to video file (Sanity media library, YouTube, etc.). Leave empty if using an image.",
                          }),
                          defineField({
                            name: "image",
                            title: "Image",
                            type: "image",
                            options: { hotspot: true },
                            description: "Image to show in the preview. Used if no video URL is provided.",
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
              ],
            }),
            defineField({
              name: "attribution",
              title: "Attribution",
              type: "array",
              description:
                "Who said it and/or context (e.g. 'Steve Jobs, Stanford commencement')",
              of: [
                {
                  type: "block",
                  styles: [{ title: "Normal", value: "normal" }],
                  lists: [],
                  marks: {
                    decorators: [
                      { title: "Italic", value: "em" },
                      { title: "Bold", value: "strong" },
                    ],
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
                              "Direct URL to video file (Sanity media library, YouTube, etc.). Leave empty if using an image.",
                          }),
                          defineField({
                            name: "image",
                            title: "Image",
                            type: "image",
                            options: { hotspot: true },
                            description: "Image to show in the preview. Used if no video URL is provided.",
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
              ],
            }),
          ],
          preview: {
            select: { title: "text", subtitle: "attribution" },
            prepare({ title, subtitle }) {
              const extractText = (blocks: { children?: { text?: string }[] }[]) =>
                Array.isArray(blocks)
                  ? blocks.map((b) => b.children?.map((c) => c.text).join("") ?? "").join(" ")
                  : blocks;
              return { title: extractText(title), subtitle: extractText(subtitle) };
            },
          },
        },
      ],
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "relatedProject",
      title: "Related Project",
      type: "reference",
      to: [{ type: "project" }],
    }),
  ],
  preview: {
    select: { title: "title", media: "coverImage" },
  },
});
