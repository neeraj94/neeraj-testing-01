export interface EmailTemplateListItem {
  id: number;
  code: string;
  name: string;
  category: string;
  description?: string;
  enabled: boolean;
  subject: string;
  updatedAt?: string;
}

export interface EmailMergeField {
  token: string;
  label: string;
  description?: string;
}

export interface EmailTemplateDetail extends EmailTemplateListItem {
  bodyHtml: string;
  availableMergeFields: EmailMergeField[];
}

export interface EmailTemplateListResponse {
  templates: EmailTemplateListItem[];
}

export interface EmailTemplateUpdatePayload {
  enabled: boolean;
  subject: string;
  bodyHtml: string;
}
