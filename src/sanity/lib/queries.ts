import { defineQuery } from "next-sanity";

const PROJECT_FIELDS = `
  _id,
  _updatedAt,
  title,
  slug,
  shortDescription,
  fullDescription,
  techStack,
  siteUrl,
  sitePassword,
  caseStudy->{ _id, slug },
  coverMedia,
  heroLayout,
  palette,
  mediaBackground,
  gallery[]{
    ...,
    _type == "galleryImage" => {
      ...,
      image { ..., asset-> { ..., metadata { dimensions } } }
    }
  },
  chapters[]{
    _key,
    _type,
    title,
    _type == "chapter" => {
      text,
      caption,
      layout,
      side,
      media {
        type,
        video,
        poster,
        image { ..., asset-> { ..., metadata { dimensions } } },
        phones[]{ _key, type, video, poster, image { ..., asset-> { ..., metadata { dimensions } } } },
        frame
      }
    },
    _type == "testSwitcher" => {
      tests[]{
        _key,
        label,
        title,
        status,
        text,
        hypothesis,
        metric,
        result,
        decision,
        caption,
        media {
          type,
          video,
          poster,
          image { ..., asset-> { ..., metadata { dimensions } } },
          phones[]{ _key, type, video, poster, image { ..., asset-> { ..., metadata { dimensions } } } },
          frame
        }
      }
    }
  },
  order,
  seo { title, description, ogImage, noIndex }
`;

// The next project's first gallery image or video (never a phones row):
// preloaded on arrival and shown as the preview block at the end of the
// gallery, the morph source for the in-place project → project transition.
const NEXT_PROJECT_MEDIA = `
  "firstMedia": gallery[_type != "galleryPhones"][0]{
    ...,
    _type == "galleryImage" => {
      ...,
      image { ..., asset-> { ..., metadata { dimensions } } }
    }
  }
`;

const JOURNAL_FIELDS = `
  _id,
  _updatedAt,
  title,
  slug,
  excerpt,
  coverImage,
  tags,
  publishedAt,
  relatedProject->{ _id, title, slug },
  seo { title, description, ogImage, noIndex }
`;

export const ABOUT_QUERY = defineQuery(`
  *[_type == "about"][0] {
    heading,
    bio,
    portrait,
    email,
    linkedinUrl,
    githubUrl
  }
`);

// The home (scatter field, entry reel) and the lab scatter field: cover and
// card text. Everything else a project carries (full gallery with asset
// documents, description, seo, password) stays on the server and is only sent
// to the browser by the project page. A draft without a slug has no page
// yet, so it is left out here as in the slug queries. Ties on `order` (and
// missing orders, which GROQ sorts last) fall back to _id, the same order
// the next-project chain below walks.
export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(order asc, _id asc) {
    _id,
    title,
    slug,
    shortDescription,
    coverMedia,
    homeLayout,
    homeTextAlign,
    palette,
    mediaBackground
  }
`);

// Siblings exclude the current document: with one project, or a project
// without `order`, the fallback would otherwise be the page itself, and a
// self-link runs the in-place transition against a route that never changes.
// The chain is a total order (order, then _id; a missing order sorts last),
// so a project sharing its `order` with another, or without one, is still
// somebody's next project instead of being skipped.
const NEXT_PROJECT_FIELDS = `title, slug, heroLayout, "hasChapters": count(chapters) > 0, ${NEXT_PROJECT_MEDIA}`;
export const PROJECT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] {
    ${PROJECT_FIELDS},
    "nextProject": coalesce(
      *[_type == "project" && _id != ^._id && (coalesce(order, 1e9) > coalesce(^.order, 1e9) || (coalesce(order, 1e9) == coalesce(^.order, 1e9) && _id > ^._id))] | order(coalesce(order, 1e9) asc, _id asc) [0] { ${NEXT_PROJECT_FIELDS} },
      *[_type == "project" && _id != ^._id] | order(coalesce(order, 1e9) asc, _id asc) [0] { ${NEXT_PROJECT_FIELDS} }
    )
  }
`);

export const JOURNAL_PAGE_QUERY = defineQuery(`
  *[_type == "journalPage"][0] { description }
`);

export const JOURNAL_POSTS_QUERY = defineQuery(`
  *[_type == "journalPost"] | order(publishedAt desc) { ${JOURNAL_FIELDS} }
`);

export const JOURNAL_POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "journalPost" && slug.current == $slug][0] {
    ${JOURNAL_FIELDS},
    body,
    "relatedPosts": *[_type == "journalPost" && _id != ^._id] | order(publishedAt desc) [0...3] { ${JOURNAL_FIELDS} }
  }
`);

export const PROJECT_SLUGS_QUERY = defineQuery(
  `*[_type == "project" && defined(slug.current)]{ "slug": slug.current }`
);

export const JOURNAL_POST_SLUGS_QUERY = defineQuery(
  `*[_type == "journalPost" && defined(slug.current)]{ "slug": slug.current }`
);

// A page hidden from search engines (seo.noIndex) is not advertised either.
export const PROJECT_SITEMAP_QUERY = defineQuery(
  `*[_type == "project" && defined(slug.current) && seo.noIndex != true]{ "slug": slug.current, _updatedAt }`
);

export const JOURNAL_POST_SITEMAP_QUERY = defineQuery(
  `*[_type == "journalPost" && defined(slug.current) && seo.noIndex != true]{ "slug": slug.current, _updatedAt }`
);
