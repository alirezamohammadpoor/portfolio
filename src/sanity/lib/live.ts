import { defineLive } from "next-sanity/live";
import { client } from "./client";

const token = process.env.SANITY_API_READ_TOKEN;

// strict: true removes draftMode()/cookie auto-resolution from sanityFetch, so
// the fetchers in ./data.ts can run inside a "use cache" boundary.
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  browserToken: false,
  strict: true,
});
