import type { IProjectRepository, ProjectSummary } from "@/core/application/repositories/project-repository.port";
import type { Project } from "@/core/domain/project";
import { getSupabaseClient } from "@/core/infrastructure/supabase/client";

const TABLE = "projects";

export function createSupabaseProjectRepo(): IProjectRepository {
  return {
    async save(project: Project): Promise<void> {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase not configured");
      const row = {
        id: project.id,
        name: project.name,
        data: {
          name: project.name,
          sourceFile: project.sourceFile,
          timeline: project.timeline,
          outputSettings: project.outputSettings,
        },
        updated_at: new Date(project.updatedAt).toISOString(),
      };
      const { error } = await supabase.from(TABLE).upsert(row, { onConflict: "id" });
      if (error) throw error;
    },

    async load(id: string): Promise<Project | null> {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      const { data, error } = await supabase.from(TABLE).select("data, id, updated_at, created_at").eq("id", id);
      if (error || !data) return null;
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) return null;
      const row = rows[0] as { data: Record<string, unknown>; created_at?: string; updated_at?: string };
      const d = row.data;
      return {
        id,
        name: (d.name as string) ?? "Untitled",
        sourceFile: d.sourceFile as Project["sourceFile"],
        timeline: d.timeline as Project["timeline"],
        outputSettings: d.outputSettings as Project["outputSettings"],
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      };
    },

    async list(): Promise<ProjectSummary[]> {
      const supabase = getSupabaseClient();
      if (!supabase) return [];
      const { data, error } = await supabase.from(TABLE).select("id, name, updated_at").order("updated_at", { ascending: false });
      if (error || !data) return [];
      const arr = Array.isArray(data) ? data : [];
      return arr.map((row: { id: string; name: string; updated_at: string }) => ({
        id: row.id,
        name: row.name,
        updatedAt: new Date(row.updated_at).getTime(),
      }));
    },

    async delete(id: string): Promise<void> {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      await supabase.from(TABLE).delete().eq("id", id);
    },
  };
}
