export type AssetType   = 'domain' | 'nft' | 'token' | 'badge' | 'digital_asset';
export type AssetStatus = 'active' | 'pending' | 'locked' | 'on_sale';

export interface Asset {
  id:            string;
  name:          string;
  asset_type:    AssetType;
  status:        AssetStatus;
  value:         number;
  currency:      'PI';
  created_at:    string;
  listing_id:    string | null;
  listing_price: number | null;
  metadata:      Record<string, unknown>;
}

export interface Listing {
  id:          string;
  asset_id:    string;
  seller_id:   string;
  price:       number;
  currency:    'PI';
  status:      string;
  title:       string;
  description: string;
  category:    string;
  created_at:  string;
  metadata:    Record<string, unknown>;
}

export interface Purchase {
  id:       string;
  asset_id: string;
  price:    number;
  title:    string;
  sold_at:  string;
  metadata: Record<string, unknown>;
}

export interface WalletData { balance: number; currency: string; }
export type MainTab = 'assets' | 'marketplace' | 'purchases' | 'portfolio';
