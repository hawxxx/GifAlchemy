"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Upload, FolderOpen } from "lucide-react";
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
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/60 backdrop-blur-xl">
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
        <section className="mb-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              {!mounted ? "Loading dashboard..." : projects.length === 0 ? "Ready to create something amazing?" : "Welcome back to your workspace"}
            </h1>
            <p className="mt-2 text-base text-[var(--muted-foreground)]">
              Drag and drop a GIF to start editing immediately, or choose a recent project.
            </p>
          </div>

          <Link href="/editor?intent=new" className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl">
            <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)]/30 px-6 py-16 transition-all duration-500 hover:border-primary/50 hover:bg-primary/5 cursor-pointer overflow-hidden">
              {/* Subtle dotted grid background */}
              <div 
                className="pointer-events-none absolute inset-0 opacity-[0.03] transition-opacity duration-500 group-hover:opacity-[0.08]"
                style={{
                  backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
                  backgroundSize: "24px 24px"
                }}
              />
              {/* Soft glow on hover */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 blur-3xl group-hover:opacity-100"
                style={{ background: "radial-gradient(circle at center, var(--primary) 0%, transparent 50%)", opacity: 0.1 }} />

              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-110 group-hover:bg-primary/20 shadow-sm relative z-10">
                <Upload className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-[var(--foreground)] transition-colors group-hover:text-primary relative z-10">Drag & drop your GIF here</h2>
              <p className="max-w-sm text-center text-sm text-[var(--muted-foreground)] relative z-10">
                Or click to start a new project from scratch. Beautiful transformations happen directly in your browser.
              </p>
              
              <div className="mt-8 flex items-center gap-4 relative z-10">
                <Button variant="default" className="shadow-lg shadow-primary/20 transition-all duration-300 group-hover:shadow-primary/50 pointer-events-none">
                  <Plus className="mr-2 h-4 w-4" />
                  Blank Project
                </Button>
              </div>
            </div>
          </Link>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">Recent Projects</h2>
              {mounted && projects.length > 0 && (
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {projects.length} project{projects.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {mounted && projects.length > 0 && (
              <Button asChild variant="ghost" size="sm" className="hidden sm:flex text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <Link href="/editor?intent=new">
                  New project →
                </Link>
              </Button>
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
