import NextLink from "next/link";

interface SocialLinkProps {
  href: string;
  label: string;
}

export default function SocialLink({ href, label }: SocialLinkProps) {
  return (
    <NextLink
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link-underline text-sub uppercase text-primary"
    >
      {label}
    </NextLink>
  );
}
