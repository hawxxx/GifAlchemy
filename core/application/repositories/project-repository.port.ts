import type { Project } from "@/core/domain/project";

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export interface IProjectRepository {
  save(project: Project): Promise<void>;
  load(id: string): Promise<Project | null>;
  list(): Promise<ProjectSummary[]>;
  delete(id: string): Promise<void>;
}
