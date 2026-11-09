// jsDelivr at the pinned submodule commit — not floating @main, and not a
// local ~200MB image mirror in the Firebase bundle.
import { YUHONAS_CDN_EXERCISES } from './yuhonas.pin.js';

export function yuhonasImageUrl(ex, frame = 0) {
  const ref = ex?.yuhonas_id || ex?.external_ids?.yuhonas?.[0];
  if (!ref) return null;
  return `${YUHONAS_CDN_EXERCISES}/${encodeURIComponent(ref)}/${frame}.jpg`;
}

// yuhonas liefert pro Übung genau 2 Frames (Start-/Endposition der Bewegung)
// — als Paar zeigt das die Bewegung, ein einzelnes Bild nur eine Pose.
export function yuhonasImageUrls(ex) {
  const ref = ex?.yuhonas_id || ex?.external_ids?.yuhonas?.[0];
  if (!ref) return [];
  return [0, 1].map((frame) => `${YUHONAS_CDN_EXERCISES}/${encodeURIComponent(ref)}/${frame}.jpg`);
}
