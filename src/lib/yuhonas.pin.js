// Pinned Yuhonas free-exercise-db commit (vendor/free-exercise-db + yuhonas.ref).
// Bump together: node scripts/sync-yuhonas-pin.mjs after updating the submodule.
// Images stay on jsDelivr at this SHA (~200MB not shipped in Firebase builds).
export const YUHONAS_COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
export const YUHONAS_CDN_EXERCISES =
  `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${YUHONAS_COMMIT}/exercises`;
