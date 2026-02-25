import { defineQuery } from "next-sanity";

const PROJECT_FIELDS = `
  _id,
  title,
  slug,
  shortDescription,
  fullDescription,
  techStack,
  siteUrl,
  caseStudy->{ _id, slug },
  coverMedia,
  images,
  videos,
  order
`;

const JOURNAL_FIELDS = `
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  tags,
  publishedAt,
  relatedProject->{ _id, title, slug }
`;

export const ABOUT_QUERY = defineQuery(`
  *[_type == "about"][0] {
    heading,
    bio,
    portrait,
    email,
    linkedinUrl
  }
`);

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project"] | order(order asc) { ${PROJECT_FIELDS} }
`);

export const PROJECT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] { ${PROJECT_FIELDS} }
`);

export const JOURNAL_POSTS_QUERY = defineQuery(`
  *[_type == "journalPost"] | order(publishedAt desc) { ${JOURNAL_FIELDS} }
`);

export const JOURNAL_POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "journalPost" && slug.current == $slug][0] { ${JOURNAL_FIELDS}, body }
`);

export const PROJECT_SLUGS_QUERY = defineQuery(
  `*[_type == "project" && defined(slug.current)]{ "slug": slug.current }`
);

export const JOURNAL_POST_SLUGS_QUERY = defineQuery(
  `*[_type == "journalPost" && defined(slug.current)]{ "slug": slug.current }`
);
