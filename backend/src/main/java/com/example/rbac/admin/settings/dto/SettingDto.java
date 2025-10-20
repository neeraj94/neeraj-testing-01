package com.example.rbac.admin.settings.dto;

import com.example.rbac.admin.settings.model.SettingValueType;

import java.util.List;

public class SettingDto {
    private Long id;
    private String code;
    private String label;
    private String description;
    private String value;
    private SettingValueType valueType;
    private boolean editable;
    private List<SettingOptionDto> options;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
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

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public SettingValueType getValueType() {
        return valueType;
    }

    public void setValueType(SettingValueType valueType) {
        this.valueType = valueType;
    }

    public boolean isEditable() {
        return editable;
    }

    public void setEditable(boolean editable) {
        this.editable = editable;
    }

    public List<SettingOptionDto> getOptions() {
        return options;
    }

    public void setOptions(List<SettingOptionDto> options) {
        this.options = options;
    }
}
