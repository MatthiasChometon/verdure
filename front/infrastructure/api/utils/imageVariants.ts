// The API serves resized copies of an image under `?w=<width>` (see `ImageController` in the
// back); the widths it offers are these. An image shown in a small box asks for one of them
// instead of the original photo.
export const imageVariant = (url: string, width: number): string => `${url}?w=${width}`;

export const imageSrcset = (url: string, widths: readonly number[]): string =>
  widths.map((width: number): string => `${imageVariant(url, width)} ${width}w`).join(', ');
