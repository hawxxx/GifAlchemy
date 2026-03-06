"use client";

import type { Project } from "@/core/domain/project";
import { getAssetFile, listAssets } from "@/lib/asset-library";

function createProjectFile(project: Project, fileBlob: ArrayBuffer, lastModified?: number): File {
  return new File([fileBlob], project.sourceFile.name, {
    type: project.sourceFile.type,
    lastModified: lastModified ?? project.updatedAt ?? Date.now(),
  });
}

export async function resolveProjectSourceFile(input: {
  project: Project;
  fileBlob: ArrayBuffer | null;
}): Promise<File | null> {
  const { project, fileBlob } = input;
  if (fileBlob && fileBlob.byteLength > 0) {
    return createProjectFile(project, fileBlob);
  }

  const assets = await listAssets(200);
  const exactMatch = assets.find(
    (asset) =>
      asset.kind === "source" &&
      asset.name === project.sourceFile.name &&
      asset.size === project.sourceFile.size &&
      (project.sourceFile.type ? asset.type === project.sourceFile.type : true)
  );
  const looseMatch =
    exactMatch ??
    assets.find(
      (asset) =>
        asset.kind === "source" &&
        asset.name === project.sourceFile.name &&
        (project.sourceFile.type ? asset.type === project.sourceFile.type : true)
    );

  if (!looseMatch) return null;
  return getAssetFile(looseMatch.id);
}
