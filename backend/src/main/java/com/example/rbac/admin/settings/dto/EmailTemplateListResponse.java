package com.example.rbac.admin.settings.dto;

import java.util.List;

public class EmailTemplateListResponse {

    private List<EmailTemplateListItemDto> templates;

    public EmailTemplateListResponse() {
    }

    public EmailTemplateListResponse(List<EmailTemplateListItemDto> templates) {
        this.templates = templates;
    }

    public List<EmailTemplateListItemDto> getTemplates() {
        return templates;
    }

    public void setTemplates(List<EmailTemplateListItemDto> templates) {
        this.templates = templates;
    }
}
