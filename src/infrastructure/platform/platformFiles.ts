import type { FileSaver, PhotoStorage } from "@/application/ports/files";
import type { PlatformAssets, PlatformDownloads } from "./runtime";

/** Photos kept in the artifact's own asset store. */
export class PlatformPhotoStorage implements PhotoStorage {
  readonly canUpload: boolean;

  constructor(private readonly assets: PlatformAssets | null) {
    this.canUpload = assets !== null;
  }

  async upload(image: Blob): Promise<string> {
    if (!this.assets) throw new Error("Uploads are not available");
    const result = await this.assets.upload(image);
    return result.id;
  }

  urlFor(photoId: string): string {
    // The host serves every stored asset at this root-relative path.
    return `/_blob/${photoId}`;
  }
}

/** Downloads offered through the host, which asks the viewer to confirm. */
export class PlatformFileSaver implements FileSaver {
  readonly canSave: boolean;

  constructor(private readonly downloads: PlatformDownloads | null) {
    this.canSave = downloads !== null;
  }

  async save(filename: string, contents: string): Promise<boolean> {
    if (!this.downloads) return false;
    try {
      await this.downloads.save({ filename, data: contents });
      return true;
    } catch {
      // Declined by the viewer or refused by the host: nothing was saved.
      return false;
    }
  }
}
