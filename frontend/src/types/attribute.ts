import type { Pagination } from './models';

export interface AttributeValue {
  id: number;
  value: string;
  sortOrder: number;
}

export interface Attribute {
  id: number;
  name: string;
  slug: string;
  values: AttributeValue[];
  createdAt: string;
  updatedAt: string;
}

export type AttributePage = Pagination<Attribute>;
