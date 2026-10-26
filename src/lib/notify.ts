"use client";

import { toast } from "sonner";

/** Copy text and confirm the outcome with a toast. Returns whether it succeeded. */
export async function copyWithToast(text: string, successMessage = "Link copied to clipboard"): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch {
    toast.error("Couldn't copy the link", { description: "Copy it from your browser's address bar instead." });
    return false;
  }
}

export { toast };
