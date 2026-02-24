import { defineQuery } from "next-sanity";

export const ABOUT_QUERY = defineQuery(`
  *[_type == "about"][0] {
    heading,
    bio,
    portrait,
    skills,
    email,
    linkedinUrl
  }
`);

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project"] | order(order asc) {
    _id,
    title,
    slug,
    shortDescription,
    fullDescription,
    techStack,
    metrics,
    siteUrl,
    caseStudy->{ _id, slug },
    coverMedia,
    images,
    videos,
    order
  }
`);

export const PROJECT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "project" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    shortDescription,
    fullDescription,
    techStack,
    metrics,
    siteUrl,
    caseStudy->{ _id, slug },
    coverMedia,
    images,
    videos,
    order
  }
`);

export const JOURNAL_POSTS_QUERY = defineQuery(`
  *[_type == "journalPost"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    coverImage,
    tags,
    publishedAt,
    relatedProject->{
      _id,
      title,
      slug
    }
  }
`);

export const JOURNAL_POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "journalPost" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    body,
    coverImage,
    tags,
    publishedAt,
    relatedProject->{
      _id,
      title,
      slug
    }
  }
`);

export const PROJECT_SLUGS_QUERY = defineQuery(
  `*[_type == "project" && defined(slug.current)]{ "slug": slug.current }`
);

export const JOURNAL_POST_SLUGS_QUERY = defineQuery(
  `*[_type == "journalPost" && defined(slug.current)]{ "slug": slug.current }`
);
