import { cacheLife, cacheTag } from "next/cache";
import { sanityFetch } from "./live";
import {
  ABOUT_QUERY,
  JOURNAL_PAGE_QUERY,
  JOURNAL_POST_BY_SLUG_QUERY,
  JOURNAL_POSTS_QUERY,
  PROJECT_BY_SLUG_QUERY,
  PROJECTS_QUERY,
} from "./queries";

// Every read is cached and tagged with the Sanity `_type`s the query pulls
// from, so one revalidateTag call in /api/revalidate covers every page that
// renders that type. The page passes the perspective it resolved from
// draftMode() (outside the cache boundary): a draft read goes through the
// same "use cache" body, which Next re-executes on every request and never
// stores while draft mode is on. next-sanity's sanityFetch calls
// cacheTag()/cacheLife() itself, so it may only run inside "use cache".
//
// The project/journalPost queries embed sibling documents (nextProject,
// relatedPosts), so any edit of that type can change any page of that type:
// hence the coarse type-level tags rather than per-slug ones.

export type Perspective = "published" | "drafts";

export async function getProjects(perspective: Perspective = "published") {
  "use cache";
  cacheLife("max");
  cacheTag("project");
  const { data } = await sanityFetch({
    query: PROJECTS_QUERY,
    perspective,
    stega: false,
  });
  return data;
}

export async function getProject(slug: string, perspective: Perspective = "published") {
  "use cache";
  cacheLife("max");
  // The case-study link joins a journal post (caseStudy->{slug}): a renamed
  // post must refresh the project page too.
  cacheTag("project", "journalPost");
  const { data } = await sanityFetch({
    query: PROJECT_BY_SLUG_QUERY,
    params: { slug },
    perspective,
    stega: false,
  });
  return data;
}

export async function getJournalPosts(perspective: Perspective = "published") {
  "use cache";
  cacheLife("max");
  cacheTag("journalPost");
  const { data } = await sanityFetch({
    query: JOURNAL_POSTS_QUERY,
    perspective,
    stega: false,
  });
  return data;
}

export async function getJournalPost(slug: string, perspective: Perspective = "published") {
  "use cache";
  cacheLife("max");
  cacheTag("journalPost");
  const { data } = await sanityFetch({
    query: JOURNAL_POST_BY_SLUG_QUERY,
    params: { slug },
    perspective,
    stega: false,
  });
  return data;
}

export async function getJournalPage(perspective: Perspective = "published") {
  "use cache";
  cacheLife("max");
  cacheTag("journalPage");
  const { data } = await sanityFetch({
    query: JOURNAL_PAGE_QUERY,
    perspective,
    stega: false,
  });
  return data;
}

export async function getAbout(perspective: Perspective = "published") {
  "use cache";
  cacheLife("max");
  cacheTag("about");
  const { data } = await sanityFetch({
    query: ABOUT_QUERY,
    perspective,
    stega: false,
  });
  return data;
}
