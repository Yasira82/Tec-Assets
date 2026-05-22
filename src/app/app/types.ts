export interface Asset {
  id:            string;
  name:          string;
  asset_type:    string;
  value:         number | string;
  currency:      string;
  status:        string;
  created_at:    string;
  listing_id:    string | null;
  listing_price: number | null;
  owner_id?:     string;                  // ✅ أضف
  metadata?:     Record<string, unknown>;
}

export interface Listing {
  id:          string;
  asset_id:    string;
  seller_id:   string;
  price:       number;
  currency:    string;
  status:      string;
  title:       string;
  description: string;
  category:    string;
  created_at:  string;
  metadata?:   Record<string, unknown>; 
}

export interface Purchase {
  id:        string;
  assetId:   string;
  sellerId:  string;
  buyerId:   string;
  price:     number;
  currency:  string;
  status:    string;
  soldAt:    string;
  asset: {
    slug:     string;
    category: string;
    metadata: Record<string, unknown>;
  };
}

export interface WalletData {
  balance:  number;
  currency: string;
  walletId: string | null;
}

export type MainTab = 'assets' | 'portfolio' | 'marketplace' | 'purchases';
