/** Stores dish photos and serves them back by id. */
export interface PhotoStorage {
  /** False when uploads are not possible for this viewer (hide the controls). */
  readonly canUpload: boolean;
  upload(image: Blob): Promise<string>;
  /** A URL an <img> can show, or null if the photo cannot be shown here. */
  urlFor(photoId: string): string | null;
}

/** Hands a generated file to the user (a download they confirm). */
export interface FileSaver {
  readonly canSave: boolean;
  /** Resolves false if the user declined. */
  save(filename: string, contents: string): Promise<boolean>;
}
