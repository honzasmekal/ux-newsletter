import type { Digest, FiredLegItem, FeedItem } from "./types";

const CAP = 10;

/**
 * Strop ~10 podnětů (§6). Legislativa má přednost; feed doplní zbytek do stropu.
 * Prázdný týden je legitimní výstup → empty=true.
 */
export function assembleDigest(
  weekOf: string,
  legislation: FiredLegItem[],
  feed: FeedItem[],
): Digest {
  const leg = legislation.slice(0, CAP);
  const room = Math.max(0, CAP - leg.length);
  const fd = feed.slice(0, room);
  return { weekOf, legislation: leg, feed: fd, empty: leg.length === 0 && fd.length === 0 };
}
