import { defineField, defineType } from "sanity";

/**
 * Backgrounds for media (Ali, 11-03): recordings stay flush, with nothing
 * recorded around the screen. The colour or image behind a clip lives here and
 * is drawn by the page. Each project carries a palette of up to four brand
 * colours plus a default background; every media item can follow that default,
 * pick a palette colour, type a one-off hex, lay an image over its colour, and
 * choose how the media sits on it.
 */

const HEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const hexField = (name: string, title: string, description: string) =>
  defineField({
    name,
    title,
    type: "string",
    description,
    validation: (rule) =>
      rule.custom((value) => (value == null || value === "" || HEX.test(value) ? true : "Use a hex colour like #120001")),
  });

const SWATCHES = [
  { title: "Colour 1", value: "1" },
  { title: "Colour 2", value: "2" },
  { title: "Colour 3", value: "3" },
  { title: "Colour 4", value: "4" },
];

const imageFields = [
  defineField({
    name: "image",
    title: "Image",
    description: "Optional, laid over the colour (e.g. a campaign still).",
    type: "image",
    options: { hotspot: true },
  }),
  defineField({
    name: "imageOpacity",
    title: "Image opacity (%)",
    type: "number",
    initialValue: 60,
    validation: (rule) => rule.min(0).max(100),
    hidden: ({ parent }) => !parent?.image?.asset,
  }),
];

/** Project level: the brand colours media can pick from. */
export const paletteField = defineField({
  name: "palette",
  title: "Brand colours",
  description: "Up to four colours that media backgrounds pick from, in order: Colour 1 to Colour 4.",
  type: "array",
  of: [
    {
      type: "object",
      name: "swatch",
      fields: [
        defineField({ name: "name", title: "Name", type: "string" }),
        { ...hexField("hex", "Hex", "e.g. #120001"), validation: (rule) => rule.required().regex(HEX) },
      ],
      preview: {
        select: { name: "name", hex: "hex" },
        prepare: ({ name, hex }) => ({ title: name || hex, subtitle: hex }),
      },
    },
  ],
  validation: (rule) => rule.max(4),
});

/** Project level: what every media item shows behind it unless it says otherwise. */
export const defaultBackgroundField = defineField({
  name: "mediaBackground",
  title: "Default media background",
  description: "Used behind every image and clip whose background is left on \"Project default\". Leave empty for none.",
  type: "object",
  fields: [
    defineField({
      name: "colour",
      title: "Colour",
      type: "string",
      options: { list: [{ title: "None", value: "none" }, ...SWATCHES], layout: "radio", direction: "horizontal" },
      initialValue: "none",
    }),
    hexField("hex", "Custom hex", "Overrides the colour above, for a one-off."),
    ...imageFields,
  ],
});

/** Per media item: background, and how the media sits on it. */
export const mediaFrame = defineType({
  name: "mediaFrame",
  title: "Background",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "colour",
      title: "Colour",
      type: "string",
      options: {
        list: [{ title: "Project default", value: "default" }, { title: "None", value: "none" }, ...SWATCHES],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "default",
    }),
    { ...hexField("hex", "Custom hex", "Overrides the colour above, for a one-off."), hidden: ({ parent }: { parent?: { colour?: string } }) => parent?.colour === "default" },
    ...imageFields.map((f) => ({
      ...f,
      hidden: ({ parent }: { parent?: { colour?: string; image?: { asset?: unknown } } }) =>
        parent?.colour === "default" || (f.name === "imageOpacity" && !parent?.image?.asset),
    })),
    defineField({
      name: "fit",
      title: "Fit",
      description: "Auto: a phone recording stands centred in a 4:5 box with rounded corners (on its background or the page); a laptop recording sits inset on its background, or flush when there is none.",
      type: "string",
      // The home draws the cover 16:10 on its background whatever this says,
      // so the cover's frame does not offer it. The form hands the parent
      // value from the same document tree, so the cover's frame is known by
      // identity; should that ever not hold, the field simply shows.
      hidden: ({ document, parent }) =>
        parent != null && parent === (document as { coverMedia?: { frame?: unknown } } | undefined)?.coverMedia?.frame,
      options: {
        list: [
          { title: "Auto", value: "auto" },
          { title: "Flush (fill the box)", value: "flush" },
          { title: "Laptop (inset)", value: "laptop" },
          { title: "Phone (centred)", value: "phone" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "auto",
    }),
    defineField({
      name: "size",
      title: "Size override (%)",
      description: "How big the media is on its background: width for a laptop recording, height for a phone. Leave empty for the preset (laptop 84, phone 88).",
      type: "number",
      validation: (rule) => rule.min(20).max(100),
    }),
  ],
});
