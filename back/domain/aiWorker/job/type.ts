// A job the worker can run next: an identify job carries an image key, an embed
// job carries the text (and, for a plant embedding, the plant it belongs to).
export type ClaimedJob = {
  id: string;
  kind: string;
  imageKey: string | null;
  inputText: string | null;
  plantId: string | null;
};

// identify/diagnose ship the photo (base64); embed ships text. `kind` tells the worker which model/prompt to run.
export type NextJob = {
  jobId?: string;
  kind?: string;
  image?: string;
  contentType?: string;
  text?: string;
};
