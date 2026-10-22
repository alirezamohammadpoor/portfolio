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

// Published reads are cached and tagged with the Sanity `_type` the query pulls
// from, so one revalidateTag call in /api/revalidate covers every page that
// renders that type. Draft reads are deliberately uncached: they only run when
// draftMode() is enabled, which already bypasses the static cache.
//
// The project/journalPost queries embed sibling documents (nextProject,
// prevProject, relatedPosts), so any edit of that type can change any page of
// that type — hence the coarse type-level tags rather than per-slug ones.

export async function getProjects() {
  "use cache";
  cacheLife("max");
  cacheTag("project");
  const { data } = await sanityFetch({
    query: PROJECTS_QUERY,
    perspective: "published",
    stega: false,
  });
  return data;
}

export async function getProjectsDraft() {
  const { data } = await sanityFetch({
    query: PROJECTS_QUERY,
    perspective: "drafts",
    stega: false,
  });
  return data;
}

export async function getProject(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("project");
  const { data } = await sanityFetch({
    query: PROJECT_BY_SLUG_QUERY,
    params: { slug },
    perspective: "published",
    stega: false,
  });
  return data;
}

export async function getProjectDraft(slug: string) {
  const { data } = await sanityFetch({
    query: PROJECT_BY_SLUG_QUERY,
    params: { slug },
    perspective: "drafts",
    stega: false,
  });
  return data;
}

export async function getJournalPosts() {
  "use cache";
  cacheLife("max");
  cacheTag("journalPost");
  const { data } = await sanityFetch({
    query: JOURNAL_POSTS_QUERY,
    perspective: "published",
    stega: false,
  });
  return data;
}

export async function getJournalPostsDraft() {
  const { data } = await sanityFetch({
    query: JOURNAL_POSTS_QUERY,
    perspective: "drafts",
    stega: false,
  });
  return data;
}

export async function getJournalPost(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("journalPost");
  const { data } = await sanityFetch({
    query: JOURNAL_POST_BY_SLUG_QUERY,
    params: { slug },
    perspective: "published",
    stega: false,
  });
  return data;
}

export async function getJournalPostDraft(slug: string) {
  const { data } = await sanityFetch({
    query: JOURNAL_POST_BY_SLUG_QUERY,
    params: { slug },
    perspective: "drafts",
    stega: false,
  });
  return data;
}

export async function getJournalPage() {
  "use cache";
  cacheLife("max");
  cacheTag("journalPage");
  const { data } = await sanityFetch({
    query: JOURNAL_PAGE_QUERY,
    perspective: "published",
    stega: false,
  });
  return data;
}

export async function getJournalPageDraft() {
  const { data } = await sanityFetch({
    query: JOURNAL_PAGE_QUERY,
    perspective: "drafts",
    stega: false,
  });
  return data;
}

export async function getAbout() {
  "use cache";
  cacheLife("max");
  cacheTag("about");
  const { data } = await sanityFetch({
    query: ABOUT_QUERY,
    perspective: "published",
    stega: false,
  });
  return data;
}

export async function getAboutDraft() {
  const { data } = await sanityFetch({
    query: ABOUT_QUERY,
    perspective: "drafts",
    stega: false,
  });
  return data;
}
