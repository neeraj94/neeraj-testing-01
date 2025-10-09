package com.example.rbac.settings.dto;

import java.util.List;

public class EmailTemplateDetailDto extends EmailTemplateListItemDto {

    private String bodyHtml;
    private List<EmailMergeFieldDto> availableMergeFields;

    public String getBodyHtml() {
        return bodyHtml;
    }

    public void setBodyHtml(String bodyHtml) {
        this.bodyHtml = bodyHtml;
    }

    public List<EmailMergeFieldDto> getAvailableMergeFields() {
        return availableMergeFields;
    }

    public void setAvailableMergeFields(List<EmailMergeFieldDto> availableMergeFields) {
        this.availableMergeFields = availableMergeFields;
    }
}
