// A job the worker can run next: an identify job carries an image key, an embed
// job carries the text (and, for a plant embedding, the plant it belongs to).
export type ClaimedJob = {
  id: string;
  kind: string;
  imageKey: string | null;
  inputText: string | null;
  plantId: string | null;
};

// An identify or diagnose job ships the photo (base64) to run the vision model
// on; an embed job ships the text to run the embedding model on. `kind` tells
// the worker which model/prompt to run.
export type NextJob = {
  jobId?: string;
  kind?: string;
  image?: string;
  contentType?: string;
  text?: string;
};
