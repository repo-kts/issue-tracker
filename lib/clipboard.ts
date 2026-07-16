// Extracts files (e.g. screenshots) from a paste event's clipboard data.
// Clipboard screenshots all arrive named "image.png", so pasted images get
// a unique timestamped name to avoid collisions across multiple pastes.
export function extractPastedFiles(e: React.ClipboardEvent): File[] {
  const items = e.clipboardData?.items;
  if (!items) return [];
  const out: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (!file) continue;
    if (file.type.startsWith("image/")) {
      const ext = file.type.split("/")[1]?.split("+")[0] || "png";
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      out.push(
        new File([file], `pasted-screenshot-${ts}.${ext}`, { type: file.type }),
      );
    } else {
      out.push(file);
    }
  }
  return out;
}
