package com.example.rbac.products.dto.publicview;

import java.util.List;

public class PublicProductVariantAttributeDto {

    private Long attributeId;
    private String attributeName;
    private String displayType;
    private List<PublicProductVariantAttributeValueDto> values;

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

    public String getDisplayType() {
        return displayType;
    }

    public void setDisplayType(String displayType) {
        this.displayType = displayType;
    }

    public List<PublicProductVariantAttributeValueDto> getValues() {
        return values;
    }

    public void setValues(List<PublicProductVariantAttributeValueDto> values) {
        this.values = values;
    }
}
