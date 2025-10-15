package com.example.rbac.products.dto.publicview;

public class PublicProductVariantAttributeValueDto {

    private Long id;
    private String label;
    private String swatchColor;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getSwatchColor() {
        return swatchColor;
    }

    public void setSwatchColor(String swatchColor) {
        this.swatchColor = swatchColor;
    }
}
