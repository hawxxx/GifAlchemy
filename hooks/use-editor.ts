"use client";

import { useEditorContext } from "@/providers/editor-provider";

export function useEditor() {
  return useEditorContext();
}
