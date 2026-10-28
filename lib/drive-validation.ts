export type DriveMetadata = { mimeType?: string; size?: string; parents?: string[]; trashed?: boolean };
const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
export function isApprovedDriveImage(item: DriveMetadata, approvedFolderId: string) {
  const size = Number(item.size);
  return Boolean(approvedFolderId && !item.trashed && item.parents?.includes(approvedFolderId) && item.mimeType && allowed.has(item.mimeType) && item.size && Number.isSafeInteger(size) && size > 0 && size <= 15_000_000);
}
