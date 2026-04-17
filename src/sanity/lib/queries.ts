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
  gallery[]{
    ...,
    _type == "galleryImage" => {
      ...,
      image { ..., asset-> { ..., metadata { dimensions } } }
    }
  },
  order,
  seo { title, description, ogImage, noIndex }
`;

const JOURNAL_FIELDS = `
  _id,
  _updatedAt,
  title,
  slug,
  excerpt,
  coverImage { ..., asset->{ _id, _type, metadata { lqip, dimensions } } },
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

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project"] | order(order asc) { ${PROJECT_FIELDS} }
`);

export const PROJECT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] {
    ${PROJECT_FIELDS},
    "nextProject": coalesce(
      *[_type == "project" && order > ^.order] | order(order asc) [0] { title, slug },
      *[_type == "project"] | order(order asc) [0] { title, slug }
    ),
    "prevProject": coalesce(
      *[_type == "project" && order < ^.order] | order(order desc) [0] { title, slug },
      *[_type == "project"] | order(order desc) [0] { title, slug }
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
    "relatedPosts": *[_type == "journalPost" && _id != ^._id] | order(publishedAt desc) { ${JOURNAL_FIELDS} }
  }
`);

export const PROJECT_SLUGS_QUERY = defineQuery(
  `*[_type == "project" && defined(slug.current)]{ "slug": slug.current }`
);

export const JOURNAL_POST_SLUGS_QUERY = defineQuery(
  `*[_type == "journalPost" && defined(slug.current)]{ "slug": slug.current }`
);
