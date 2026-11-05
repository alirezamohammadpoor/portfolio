import { draftMode } from "next/headers";
import { SanityLive } from "@/sanity/lib/live";
import DraftVisualEditing from "@/components/layout/DraftVisualEditing";

export default async function DraftModeTools() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;

  // includeDrafts needs a browser token, which this setup does not ship:
  // published events keep flowing, draft edits refresh through
  // DraftVisualEditing instead. (defineLive is strict, so the boolean is
  // spelled out.)
  return (
    <>
      <SanityLive includeDrafts={false} />
      <DraftVisualEditing />
    </>
  );
}
