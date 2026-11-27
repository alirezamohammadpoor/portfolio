import type { ABOUT_QUERY_RESULT } from "@/sanity/types";

export type Contact = Pick<NonNullable<ABOUT_QUERY_RESULT>, "email" | "linkedinUrl" | "githubUrl">;

/**
 * "Say hello by email, or find me on LinkedIn and GitHub.", with a link on
 * each channel the About document has. A missing channel drops out of the
 * sentence instead of leaving a dead word behind.
 */
export function ClosingLine({ contact }: { contact: Contact }) {
  // The journal's link style: a hairline under the word and a pistachio
  // sweep behind it on hover.
  const link = "link-highlight border-b border-primary";
  const email = contact.email ? (
    <a href={`mailto:${contact.email}`} className={link}>
      email
    </a>
  ) : null;
  const profiles = [
    contact.linkedinUrl ? (
      <a
        key="in"
        href={contact.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        LinkedIn
      </a>
    ) : null,
    contact.githubUrl ? (
      <a
        key="gh"
        href={contact.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        GitHub
      </a>
    ) : null,
  ].filter(Boolean);
  const findMe = profiles.length ? (
    <>
      find me on {profiles[0]}
      {profiles[1] ? <> and {profiles[1]}</> : null}
    </>
  ) : null;
  if (email && findMe)
    return (
      <>
        Say hello by {email}, or {findMe}.
      </>
    );
  if (email) return <>Say hello by {email}.</>;
  return <>Say hello, {findMe}.</>;
}
