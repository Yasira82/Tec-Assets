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
