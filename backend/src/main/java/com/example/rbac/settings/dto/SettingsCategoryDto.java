package com.example.rbac.settings.dto;

import java.util.List;

public class SettingsCategoryDto {
    private String key;
    private String label;
    private String description;
    private List<SettingsSectionDto> sections;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
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

    public List<SettingsSectionDto> getSections() {
        return sections;
    }

    public void setSections(List<SettingsSectionDto> sections) {
        this.sections = sections;
    }
}
