package com.example.rbac.admin.products.dto;

import java.util.List;

public class ProductAttributeDto {

    private Long attributeId;
    private String attributeName;
    private List<ProductAttributeValueDto> values;

    public Long getAttributeId() {
        return attributeId;
    }

    public void setAttributeId(Long attributeId) {
        this.attributeId = attributeId;
    }

    public String getAttributeName() {
        return attributeName;
    }

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public List<ProductAttributeValueDto> getValues() {
        return values;
    }

    public void setValues(List<ProductAttributeValueDto> values) {
        this.values = values;
    }
}
