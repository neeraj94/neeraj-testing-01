import type { Pagination } from './models';

export type TaxRateType = 'PERCENTAGE' | 'FLAT';

export interface TaxRate {
  id: number;
  name: string;
  rateType: TaxRateType;
  rateValue: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaxRatePage = Pagination<TaxRate>;
