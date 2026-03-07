import NextLink from "next/link";

export default function LinkedInLink({ href }: { href: string }) {
  return (
    <NextLink
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link-underline text-sub uppercase text-primary"
    >
      LinkedIn
    </NextLink>
  );
}
