import type { Pagination } from './models';

export interface ShippingOption {
  id: number;
  label: string;
}

export interface ShippingCountry {
  id: number;
  name: string;
  code?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingState {
  id: number;
  countryId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingCity {
  id: number;
  stateId: number;
  countryId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAreaRate {
  id: number;
  countryId: number;
  countryName: string;
  stateId: number;
  stateName: string;
  cityId: number;
  cityName: string;
  costValue: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShippingAreaRatePage = Pagination<ShippingAreaRate>;
