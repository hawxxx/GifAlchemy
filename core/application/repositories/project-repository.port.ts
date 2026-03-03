import type { Project } from "@/core/domain/project";

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export interface ProjectWithBlob {
  project: Project;
  fileBlob: ArrayBuffer | null;
}

export interface IProjectRepository {
  save(project: Project, fileBlob?: ArrayBuffer): Promise<void>;
  load(id: string): Promise<ProjectWithBlob | null>;
  list(): Promise<ProjectSummary[]>;
  delete(id: string): Promise<void>;
}
