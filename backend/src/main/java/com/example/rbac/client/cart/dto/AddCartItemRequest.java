<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/cart/dto/AddCartItemRequest.java
package com.example.rbac.client.cart.dto;
========
package com.example.rbac.admin.cart.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/cart/dto/AddCartItemRequest.java

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class AddCartItemRequest {

    @NotNull
    private Long productId;

    private Long variantId;

    @NotNull
    @Min(1)
    private Integer quantity;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
