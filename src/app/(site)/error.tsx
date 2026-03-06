"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 desktop:px-6">
      <h1 className="text-primary">Error</h1>
      <p className="mt-4 text-body text-secondary">Something went wrong.</p>
      <button
        onClick={() => reset()}
        aria-label="Try again"
        className="mt-8 text-sub text-primary uppercase"
      >
        Try again
      </button>
    </div>
  );
}
