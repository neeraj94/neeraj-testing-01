package com.example.rbac.settings.dto;

public class EmailMergeFieldDto {

    private String token;
    private String label;
    private String description;

    public EmailMergeFieldDto() {
    }

    public EmailMergeFieldDto(String token, String label, String description) {
        this.token = token;
        this.label = label;
        this.description = description;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
