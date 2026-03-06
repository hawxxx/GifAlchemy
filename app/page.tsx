"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Upload, Type, Share2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SearchSortBar, type SortOption, type ViewMode } from "@/components/projects/search-sort-bar";
import { ProjectsGrid } from "@/components/projects/projects-grid";
import { UploadsSection } from "@/components/projects/uploads-section";
import { EmptyState } from "@/components/projects/empty-state";
import type { Project } from "@/components/projects/project-card";

const PROJECTS_KEY = "gifalchemy:projects";

function sortProjects(projects: Project[], sort: SortOption): Project[] {
  return [...projects].sort((a, b) => {
    switch (sort) {
      case "recent":
        return b.updatedAt - a.updatedAt;
      case "oldest":
        return a.updatedAt - b.updatedAt;
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
    }
  });
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [view, setView] = useState<ViewMode>("grid");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (raw) setProjects(JSON.parse(raw) as Project[]);
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const saveProjects = useCallback((updated: Project[]) => {
    setProjects(updated);
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  function handleDeleteProject(id: string) {
    saveProjects(projects.filter((p) => p.id !== id));
  }

  function handleRenameProject(id: string, name: string) {
    saveProjects(projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)));
  }

  const filteredProjects = sortProjects(
    projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    sort
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)]">
              <Sparkles className="h-4 w-4 text-[var(--primary-foreground)]" />
            </div>
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-base font-semibold tracking-tight text-transparent">
              GifAlchemy
            </span>
          </div>
          <Button asChild size="sm">
            <Link href="/editor?intent=new">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-6 py-10">
        <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--muted)] to-[var(--accent)] px-8 py-14 text-center">
          <div
            className="pointer-events-none absolute inset-0 animate-hero-pulse"
            style={{
              backgroundImage:
                "radial-gradient(circle at 28% 55%, oklch(0.65 0.2 250), transparent 48%), radial-gradient(circle at 72% 45%, oklch(0.65 0.15 300), transparent 48%)",
            }}
          />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
              <Sparkles className="h-3 w-3 text-[var(--primary)]" />
              Browser-native GIF editor
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                GifAlchemy
              </span>
              <br />
              <span className="text-[var(--foreground)]">Transform your GIFs</span>
            </h1>
            <p className="mx-auto mb-8 max-w-md text-base leading-relaxed text-[var(--muted-foreground)]">
              Add text, effects, and animations to any GIF — right in your browser. No installs, no uploads.
            </p>
            <Button
              asChild
              size="lg"
              className="ring-1 ring-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/30 transition-all duration-200 hover:shadow-[var(--primary)]/40"
            >
              <Link href="/editor?intent=new">
                <Plus className="h-4 w-4" />
                Start New Project
              </Link>
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Projects</h2>
              {mounted && projects.length > 0 && (
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  {projects.length} project{projects.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {mounted && projects.length > 0 && (
              <Link
                href="/editor?intent=new"
                className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                New project →
              </Link>
            )}
          </div>

          {mounted && projects.length > 0 && (
            <div className="mb-5">
              <SearchSortBar
                search={search}
                onSearchChange={setSearch}
                sort={sort}
                onSortChange={setSort}
                view={view}
                onViewChange={setView}
              />
            </div>
          )}

          {!mounted ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-xl bg-[var(--muted)]" />
              ))}
            </div>
          ) : filteredProjects.length > 0 ? (
            <ProjectsGrid
              projects={filteredProjects}
              view={view}
              onDelete={handleDeleteProject}
              onRename={handleRenameProject}
            />
          ) : (
            <EmptyState
              icon={<FolderOpen className="h-10 w-10 text-muted-foreground/30" />}
              title={search ? "No matching projects" : "No projects yet"}
              description={
                search
                  ? `No projects match "${search}". Try a different search.`
                  : "Create your first project by uploading a GIF and adding text, effects, and more."
              }
              action={
                search
                  ? undefined
                  : { label: "Create First Project", onClick: () => router.push("/editor?intent=new") }
              }
            />
          )}
        </section>

        <Separator className="bg-[var(--border)]" />

        <section>
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Your Uploads</h2>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                Persistent source assets ready to reuse in new projects
              </p>
            </div>
          </div>
          <UploadsSection />
        </section>

        <Separator className="bg-[var(--border)]" />

        <section>
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">How it works</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Three simple steps to transform any GIF</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: <Upload className="h-5 w-5" />,
                step: "01",
                title: "Upload GIF",
                description: "Drop any GIF file into the editor. Supports files up to 50MB.",
              },
              {
                icon: <Type className="h-5 w-5" />,
                step: "02",
                title: "Add Text & Effects",
                description: "Layer text overlays with animations, custom fonts, and timing controls.",
              },
              {
                icon: <Share2 className="h-5 w-5" />,
                step: "03",
                title: "Export & Share",
                description: "Export your edited GIF, optimized and ready to share anywhere.",
              },
            ].map(({ icon, step, title, description }) => (
              <div
                key={step}
                className="group relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--muted)]"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)]/20">
                    {icon}
                  </div>
                  <span className="font-mono text-xs font-semibold text-[var(--muted-foreground)]">{step}</span>
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-[var(--border)] py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GifAlchemy</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">Browser-native · No uploads · Privacy first</p>
        </div>
      </footer>
    </div>
  );
}
