import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[var(--header-height)] items-center justify-between bg-bg px-6">
      <Link href="/" className="text-sub text-primary py-5">
        Ali Reza Mohammad Poor
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/journal" className="text-sub text-primary">
          Journal
        </Link>
        <Link href="/about" className="text-sub text-primary">
          About
        </Link>
      </nav>
    </header>
  );
}
