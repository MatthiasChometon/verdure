// VAPID keys travel as base64url; the Push API wants raw bytes as a BufferSource,
// backed by an explicit ArrayBuffer (never a SharedArrayBuffer-backed view).
// Returns undefined for anything that is not valid base64url, instead of throwing.
export const decodeVapidKey = (base64: string): Uint8Array<ArrayBuffer> | undefined => {
  if (!/^[A-Za-z0-9_-]+$/.test(base64) || base64.length % 4 === 1) {
    return undefined;
  }
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
};
