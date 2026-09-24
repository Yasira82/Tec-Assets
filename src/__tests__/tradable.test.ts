import { describe, it, expect } from 'vitest';
import { isSoldForPi } from '@/lib/tradable';

// A registered property showed "List for Sale" and was listed at 50π. Estate takes Pi for
// services only, never a property's value (C-114 §4, §6); the service refuses it, and the
// screen should not offer it.
describe('isSoldForPi', () => {
  it('a property is never offered for sale', () => {
    expect(isSoldForPi('real_estate')).toBe(false);
    expect(isSoldForPi('REAL_ESTATE')).toBe(false);
  });
  it('domains and NFTs still are', () => {
    expect(isSoldForPi('nft')).toBe(true);
    expect(isSoldForPi('domain')).toBe(true);
  });
});
