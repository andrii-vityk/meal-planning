import { newId } from "@/application/ids";
import type { FileSaver, PhotoStorage } from "@/application/ports/files";

/** Photos kept in memory for local development and tests. */
export class MemoryPhotoStorage implements PhotoStorage {
  readonly canUpload = true;
  private readonly urls = new Map<string, string | null>();

  upload(image: Blob): Promise<string> {
    const id = newId();
    // Object URLs exist in browsers but not in the test environment.
    const url = typeof URL.createObjectURL === "function" ? URL.createObjectURL(image) : null;
    this.urls.set(id, url);
    return Promise.resolve(id);
  }

  urlFor(photoId: string): string | null {
    return this.urls.get(photoId) ?? null;
  }
}

/** Plain browser download, used outside the artifact host. */
export class BrowserFileSaver implements FileSaver {
  readonly canSave = true;

  save(filename: string, contents: string): Promise<boolean> {
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return Promise.resolve(true);
  }
}
