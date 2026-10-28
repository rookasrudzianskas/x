import { normalizeHandle } from "./estimate";

/** Page params may retain URL encoding; decode a path segment exactly once. */
export function normalizeHandleSegment(segment: string) {
  try {
    return normalizeHandle(decodeURIComponent(segment));
  } catch {
    return null;
  }
}
