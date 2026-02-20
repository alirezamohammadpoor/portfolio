import type { PortableTextBlock } from "next-sanity";

export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  alt?: string;
}

export interface Metric {
  _key: string;
  label: string;
  value: string;
}

export interface VideoAsset {
  _key: string;
  _type: "file";
  asset: {
    _ref: string;
    _type: "reference";
  };
}

export interface CoverMedia {
  type: "image" | "video";
  image?: SanityImage;
  video?: VideoAsset;
}

export interface Project {
  _id: string;
  _type: "project";
  title: string;
  slug: {
    _type: "slug";
    current: string;
  };
  shortDescription: string;
  fullDescription: string;
  techStack: string[];
  metrics: Metric[];
  siteUrl?: string;
  caseStudySlug?: string;
  coverMedia?: CoverMedia;
  images: SanityImage[];
  videos?: VideoAsset[];
  order: number;
}

export interface JournalPost {
  _id: string;
  _type: "journalPost";
  title: string;
  slug: {
    _type: "slug";
    current: string;
  };
  excerpt: string;
  body: PortableTextBlock[];
  coverImage: SanityImage;
  tags: string[];
  publishedAt: string;
  relatedProject?: {
    _ref: string;
    _type: "reference";
  };
}

export interface ProjectPanelProps {
  project: Project;
  index: number;
}

export interface MediaPanelProps {
  coverMedia?: CoverMedia;
  title: string;
}

export interface DetailsDrawerProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
