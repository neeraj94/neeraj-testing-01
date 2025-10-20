package com.example.rbac.admin.products.dto;

import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.List;

public class SelectedAttributeRequest {

    @NotNull(message = "Attribute id is required")
    private Long attributeId;

    private List<Long> valueIds = new ArrayList<>();

    public Long getAttributeId() {
        return attributeId;
    }

    public void setAttributeId(Long attributeId) {
        this.attributeId = attributeId;
    }

    public List<Long> getValueIds() {
        return valueIds;
    }

    public void setValueIds(List<Long> valueIds) {
        this.valueIds = valueIds;
    }
}
