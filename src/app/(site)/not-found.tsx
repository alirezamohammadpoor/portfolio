import { Link } from "next-view-transitions";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="text-display text-primary">404</h1>
      <p className="mt-4 text-body text-secondary">Page not found.</p>
      <Link href="/" className="link-underline mt-8 text-sub text-primary uppercase">
        Back to home
      </Link>
    </div>
  );
}
