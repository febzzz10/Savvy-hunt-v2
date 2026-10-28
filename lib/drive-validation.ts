export type DriveMetadata = { id?: string; name?: string; createdTime?: string; mimeType?: string; size?: string; parents?: string[]; trashed?: boolean; md5Checksum?: string; driveId?: string; capabilities?: { canAddChildren?: boolean } };
export const MAX_IMAGE_BYTES = 15_000_000;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const allowed = new Set(IMAGE_MIME_TYPES);
export function isApprovedDriveImage(item: DriveMetadata, approvedFolderId: string) {
  const size = Number(item.size);
  return Boolean(approvedFolderId && !item.trashed && item.parents?.includes(approvedFolderId) && item.mimeType && allowed.has(item.mimeType) && item.size && Number.isSafeInteger(size) && size > 0 && size <= MAX_IMAGE_BYTES);
}
