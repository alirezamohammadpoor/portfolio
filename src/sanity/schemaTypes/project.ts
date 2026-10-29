import { defineType, defineField } from "sanity";


// Shared by chapters and the tests inside a test switcher.
const chapterTextField = defineField({
  name: "text",
  title: "Text",
  type: "array",
  of: [
    {
      type: "block",
      styles: [{ title: "Normal", value: "normal" }],
      lists: [],
      marks: {
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
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
                validation: (rule) => rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
              }),
            ],
          },
        ],
      },
    },
  ],
});

const chapterMediaField = defineField({
  name: "media",
  title: "Media",
  type: "object",
  fields: [
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: { list: ["image", "video"], layout: "radio" },
      initialValue: "video",
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
    defineField({
      name: "poster",
      title: "Poster",
      type: "image",
      description: "First frame of the video, shown until it loads.",
      hidden: ({ parent }) => parent?.type !== "video",
    }),
  ],
});

const chapterCaptionField = defineField({
  name: "caption",
  title: "Caption",
  type: "text",
  rows: 2,
  description: "One line under the media. Numbers are welcome here.",
});

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
      description: "Cover on the home and the first frame of the morph. Export flush: laptop recordings 16:10 (1920×1200), phone recordings 4:5 (1080×1350), no bars.",
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
      name: "homeLayout",
      title: "Home layout",
      description:
        "Where this project's cover and text sit on the home canvas (laptop; phones stack everything full width). Leave empty to let the row take the next shape in the cycle.",
      type: "string",
      options: {
        layout: "radio",
        list: [
          { title: "Wide media left, text on the right", value: "wide-left" },
          { title: "Wide media right, text on the left", value: "wide-right" },
          { title: "Media centred, text on the right", value: "centre" },
          { title: "Full bleed media, text under it", value: "full" },
          { title: "Tall media left, text beside it (phone recordings, 4:5)", value: "tall-left" },
          { title: "Small media right, text on the left", value: "small-right" },
        ],
      },
    }),
    defineField({
      name: "homeTextAlign",
      title: "Home text position",
      description: "Where the text hangs on the media's edge: top, middle or bottom. Not used by the full bleed layout.",
      type: "string",
      options: {
        layout: "radio",
        direction: "horizontal",
        list: [
          { title: "Top", value: "top" },
          { title: "Middle", value: "middle" },
          { title: "Bottom", value: "bottom" },
        ],
      },
      hidden: ({ parent }) => parent?.homeLayout === "full",
    }),
    defineField({
      name: "heroLayout",
      title: "Project page opener",
      description: "Which side the landing media takes on the project page. Leave empty to alternate per project.",
      type: "string",
      options: {
        layout: "radio",
        direction: "horizontal",
        list: [
          { title: "Media right, text left", value: "media-right" },
          { title: "Media left, text right", value: "media-left" },
        ],
      },
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
    defineField({
      name: "chapters",
      title: "Chapters",
      description:
        "The case study. One chapter = a title lane, a reading lane and a media row with its caption. A project with chapters gets the chapter page (hero + chapters + next project); without them it keeps the gallery page. The first gallery item is still the hero's landing media.",
      type: "array",
      of: [
        {
          type: "object",
          name: "chapter",
          title: "Chapter",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              description: "A written title, e.g. \"Every test had been off since 1 July\". Numbers go inside the sentence.",
              validation: (rule) => rule.required(),
            }),
            chapterTextField,
            chapterMediaField,
            chapterCaptionField,
            defineField({
              name: "layout",
              title: "Layout",
              type: "string",
              description:
                "Laptop only (mobile is one column: title, text, media, caption). Full: media across all 12 columns under the text. Wide left / wide right: media on 7 columns under the text, left or right. Beside: text on the left and media on the right (or mirrored), on one row.",
              options: {
                list: [
                  { title: "Full (12 cols)", value: "full" },
                  { title: "Wide left (1-7)", value: "wide-left" },
                  { title: "Wide right (6-12)", value: "wide-right" },
                  { title: "Beside (text + media on one row)", value: "beside" },
                ],
                layout: "radio",
                direction: "horizontal",
              },
              initialValue: "full",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "side",
              title: "Media side",
              type: "string",
              description: "Beside only: which side the media sits on (laptop).",
              options: {
                list: [
                  { title: "Left", value: "left" },
                  { title: "Right", value: "right" },
                ],
                layout: "radio",
                direction: "horizontal",
              },
              initialValue: "right",
              hidden: ({ parent }) => parent?.layout !== "beside",
            }),
          ],
          preview: {
            select: { title: "title", layout: "layout", side: "side", media: "media.image" },
            prepare({ title, layout, side, media }) {
              const place = layout === "beside" ? `beside · ${side ?? "right"}` : (layout ?? "full");
              return { title: title || "Chapter", subtitle: place, media };
            },
          },
        },
        {
          type: "object",
          name: "testSwitcher",
          title: "Test switcher",
          description:
            "One view for several A/B tests: the tests stack as pills in the title lane, the selected test's text sits in the reading lane and its media below.",
          fields: [
            defineField({
              name: "title",
              title: "Section title",
              type: "string",
              description: "Optional heading above the switcher.",
            }),
            defineField({
              name: "tests",
              title: "Tests",
              type: "array",
              validation: (rule) => rule.min(2),
              of: [
                {
                  type: "object",
                  name: "abTest",
                  title: "Test",
                  fields: [
                    defineField({
                      name: "label",
                      title: "Pill label",
                      type: "string",
                      description: "Short, e.g. \"Bestseller badge\".",
                      validation: (rule) => rule.required(),
                    }),
                    defineField({
                      name: "title",
                      title: "Title",
                      type: "string",
                      validation: (rule) => rule.required(),
                    }),
                    defineField({
                      name: "status",
                      title: "Status",
                      type: "string",
                      description: "One line, e.g. \"Live since 20 Oct · final read 3 Nov\".",
                    }),
                    chapterTextField,
                    chapterMediaField,
                    chapterCaptionField,
                  ],
                  preview: {
                    select: { title: "label", subtitle: "status", media: "media.image" },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: { title: "title", tests: "tests" },
            prepare({ title, tests }) {
              const n = Array.isArray(tests) ? tests.length : 0;
              return { title: title || "Test switcher", subtitle: `${n} tests` };
            },
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
