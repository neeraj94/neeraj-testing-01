<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/shipping/dto/ShippingOptionDto.java
package com.example.rbac.client.shipping.dto;
========
package com.example.rbac.admin.shipping.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/shipping/dto/ShippingOptionDto.java

public class ShippingOptionDto {
    private Long id;
    private String label;

    public ShippingOptionDto() {
    }

    public ShippingOptionDto(Long id, String label) {
        this.id = id;
        this.label = label;
    }

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
}
