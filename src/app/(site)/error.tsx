"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="text-display text-primary">Error</h1>
      <p className="mt-4 text-body text-secondary">Something went wrong.</p>
      <button
        onClick={() => reset()}
        className="mt-8 text-sub text-primary uppercase"
      >
        Try again
      </button>
    </div>
  );
}
