/**
 * Asset types that are never sold for Pi. Mirrors tec-asset-service `common/tradable.ts`,
 * which is the authority — it refuses the listing whatever this screen shows. This copy
 * only keeps the button from offering what the service will refuse.
 *
 * A property is recorded as an asset for its owner's portfolio; TEC Estate takes Pi for
 * services only, never the property's value (KB C-114 §4, §6).
 */
const NOT_SOLD_FOR_PI = ['real_estate'];

export const isSoldForPi = (assetType: string | null | undefined): boolean =>
  !NOT_SOLD_FOR_PI.includes(String(assetType ?? '').toLowerCase());

/**
 * Asset categories Tec-Assets does not display. A property is recorded in
 * tec-asset-service because Estate has no store of its own, but TEC Estate owns its
 * screens ("Property detail pages", KB C-114 §4). Shown here it was a card with a 0π
 * value, a Transfer button to a route that does not exist and a "Delete NFT" button
 * that would erase Estate's record from inside another app. Its owner sees it in Estate.
 */
const SHOWN_ELSEWHERE = ['REAL_ESTATE'];

export const shownInAssets = (category: string | null | undefined): boolean =>
  !SHOWN_ELSEWHERE.includes(String(category ?? '').toUpperCase());
