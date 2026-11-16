import type { PortableTextBlock } from "next-sanity";

/**
 * The bio's first sentence leads, the rest follows as body. Only a plain
 * first paragraph is split (no marks or links in it); anything richer
 * keeps its blocks as they are and leads with nothing.
 */
export function splitLead(bio: PortableTextBlock[]): { lead: string | null; body: PortableTextBlock[] } {
  const [first, ...rest] = bio;
  const children = (first?.children ?? []) as { _type: string; text?: string; marks?: string[] }[];
  const plain = first?._type === "block" && children.every((c) => c._type === "span" && !c.marks?.length);
  if (!plain) return { lead: null, body: bio };
  const text = children.map((c) => c.text ?? "").join("");
  const end = text.search(/[.!?](\s|$)/);
  if (end < 0) return { lead: text, body: rest };
  const lead = text.slice(0, end + 1);
  const tail = text.slice(end + 1).trim();
  const tailBlock = tail
    ? [{ ...first, _key: `${first._key ?? "b"}-tail`, children: [{ _type: "span", _key: "t", text: tail, marks: [] }] }]
    : [];
  return { lead, body: [...tailBlock, ...rest] as PortableTextBlock[] };
}
