import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold mb-4">GifAlchemy</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Browser GIF editor
      </p>
      <Link
        href="/editor"
        className="rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity duration-120"
      >
        Open editor
      </Link>
    </main>
  );
}
