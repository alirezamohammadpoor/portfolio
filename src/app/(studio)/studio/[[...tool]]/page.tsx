import Studio from "./Studio";

// The Studio is a client app: one static shell at /studio, built once,
// instead of a function run on every hard load. Its own routes
// (/studio/structure/…) are served that shell too and route in the browser.
export function generateStaticParams() {
  return [{ tool: [] }];
}

export default function StudioPage() {
  return <Studio />;
}
