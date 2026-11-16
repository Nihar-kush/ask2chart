import { Link } from "react-router";

export function LandingPage() {
  return (
    <>
      <header className="border-b">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4"
        >
          <Link to="/" className="font-semibold tracking-tight">
            Ask2Chart
          </Link>
          <Link
            to="/workspace"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Open workspace
          </Link>
        </nav>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-6 py-20 sm:py-28">
        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Explore CSV data in your browser
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
          Ask questions about a dataset, see the answers in charts, and inspect
          how each result was calculated.
        </p>
        <Link
          to="/workspace/datasets?sample=1"
          className="justify-self-start text-sm font-medium underline underline-offset-4"
        >
          Try sample data
        </Link>
      </main>
    </>
  );
}
