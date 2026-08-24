// The storage contract every driver implements. It doubles as the injection
// token: the whole app injects `FileStorageService`, and the module binds it to
// whichever driver `STORAGE_DRIVER` selects (disk by default, s3 for MinIO/S3).
// Images are always served back through the API (see ImageController), never by
// exposing the store, so the driver only has to move bytes by an opaque key.
export abstract class FileStorageService {
  // Store the bytes and return the opaque key the API serves them under.
  abstract upload(body: Buffer, contentType: string): Promise<string>;

  abstract remove(key: string): Promise<void>;

  abstract read(key: string): Promise<{ body: Uint8Array; contentType: string }>;
}
