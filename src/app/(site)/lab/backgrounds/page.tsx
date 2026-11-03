import type { Metadata } from "next";
import MediaFrame from "@/components/MediaFrame";
import PhonesRow from "@/components/PhonesRow";
import InlineClip from "@/components/project/InlineClip";
import { fileUrl } from "@/sanity/lib/image";
import { resolveFrame, type FrameInput, type ProjectFrameSource } from "@/lib/mediaFrame";

// Media backgrounds (Ali, 11-03): flush recordings on a background set in
// Sanity. One laptop clip and one phone clip under each setting, so the
// presets can be judged side by side. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Backgrounds",
  robots: { index: false, follow: false },
};

const LAPTOP = "file-94cdbae7c91ff12805a6399d0fa1135b30e65f60-mp4"; // stronger-landing-flush, 1920×1200
const PHONE = "file-6431d488d687b9e1b021f843f57bfc5d0af36dc8-mp4"; // 10-mobile-plp-badge-390, 780×1634

// A project palette as an editor would set it (Pritch-like: warm grey, red, oxblood).
const PROJECT: ProjectFrameSource = {
  palette: [{ hex: "#ECEAE8" }, { hex: "#D0021B" }, { hex: "#120001" }],
  mediaBackground: { colour: "1" },
};

const ROWS: { label: string; frame: FrameInput; project?: ProjectFrameSource }[] = [
  { label: "No background (flush)", frame: { colour: "none" } },
  { label: "Project default (Colour 1)", frame: { colour: "default" }, project: PROJECT },
  { label: "Colour 3", frame: { colour: "3" }, project: PROJECT },
  { label: "Colour 2, size override 70 %", frame: { colour: "2", size: 70 }, project: PROJECT },
  { label: "Custom hex #0b3d91", frame: { colour: "none", hex: "#0b3d91" }, project: PROJECT },
];

export default function BackgroundsLab() {
  return (
    <div className="px-margin pt-8 pb-24">
      <h1 className="text-h2">Media backgrounds</h1>
      <p className="mt-2 text-body text-secondary">Same flush recordings, background and fit from Sanity.</p>
      <div className="mt-10 flex flex-col gap-16">
        {ROWS.map((row) => {
          const project = row.project ?? null;
          return (
            <section key={row.label}>
              <h2 className="text-h3">{row.label}</h2>
              <div className="mt-4 grid grid-cols-1 gap-2 desktop:grid-cols-2">
                <MediaFrame frame={resolveFrame(row.frame, project, "landscape")} mediaAspect={1920 / 1200}>
                  <InlineClip src={fileUrl(LAPTOP)} label="Laptop clip" className="absolute inset-0 h-full w-full object-cover" />
                </MediaFrame>
                <MediaFrame frame={resolveFrame(row.frame, project, "portrait")} mediaAspect={780 / 1634}>
                  <InlineClip src={fileUrl(PHONE)} label="Phone clip" className="absolute inset-0 h-full w-full object-cover" />
                </MediaFrame>
              </div>
              <div className="mt-2">
                <PhonesRow
                  slots={[
                    { _key: "a", type: "video", video: { asset: { _ref: PHONE } } },
                    { _key: "b", type: "video", video: { asset: { _ref: PHONE } } },
                  ]}
                  frame={resolveFrame(row.frame, project, "phones")}
                  title="Phones row"
                  active
                  sizes="50vw"
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
