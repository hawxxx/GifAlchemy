"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ProjectCard, type Project } from "./project-card";

interface ProjectsGridProps {
  projects: Project[];
  view?: "grid" | "list";
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ProjectsGrid({ projects, view = "grid", onDelete, onRename }: ProjectsGridProps) {
  const router = useRouter();

  if (view === "list") {
    return (
      <div className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group flex items-center gap-4 px-4 py-3 bg-[var(--card)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
            onClick={() => router.push(`/editor?project=${project.id}`)}
          >
            <div className="h-10 w-16 shrink-0 rounded-md overflow-hidden bg-[var(--muted)]">
              {project.previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.previewDataUrl} alt={project.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(oklch(0.25 0 0) 0% 25%, oklch(0.2 0 0) 0% 50%)",
                    backgroundSize: "8px 8px",
                  }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">{project.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {new Date(project.updatedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={() => router.push(`/editor?project=${project.id}`)}
          onDelete={() => onDelete(project.id)}
          onRename={(name) => onRename(project.id, name)}
        />
      ))}
    </div>
  );
}
