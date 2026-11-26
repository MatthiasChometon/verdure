// Storage contract every driver implements; also the DI token the module
// binds to whichever driver STORAGE_DRIVER selects. Served only via ImageController.
export abstract class FileStorageService {
  // Store the bytes and return the opaque key the API serves them under.
  // A key can be given for derived files (resized variants); otherwise a fresh one is minted.
  abstract upload(
    body: Buffer,
    contentType: string,
    key?: string,
  ): Promise<string>;

  // Removes the file and every resized variant made from it.
  abstract remove(key: string): Promise<void>;

  abstract read(
    key: string,
  ): Promise<{ body: Uint8Array; contentType: string }>;
}
