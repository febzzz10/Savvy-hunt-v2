/**
 * Drive sync stores the file name as a photo's alt text until an organizer writes a real one. A name such as
 * "IMG_4821.jpg" is useless to screen readers and search engines, so it is swapped for an honest generic description.
 */
export const GENERIC_PHOTO_ALT = "Savvy Hunt 2026 photograph from MGM School, Kottarakara";
const FILE_EXTENSION = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;
const CAMERA_NAME = /^(img|dsc|dscn|pxl|mvimg|photo|image|screenshot|whatsapp image|wa)[\s_-]*\d/i;
const BARE_NUMBER = /^[\d_\-\s]{6,}$/;

export function looksLikeFilename(alt: string) {
  const text = alt.trim();
  return FILE_EXTENSION.test(text) || CAMERA_NAME.test(text) || BARE_NUMBER.test(text);
}

export function photoAlt(alt: string | undefined | null) {
  const text = alt?.trim();
  return text && !looksLikeFilename(text) ? text : GENERIC_PHOTO_ALT;
}
