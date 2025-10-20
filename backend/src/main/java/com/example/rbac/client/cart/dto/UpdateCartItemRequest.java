<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/cart/dto/UpdateCartItemRequest.java
package com.example.rbac.client.cart.dto;
========
package com.example.rbac.admin.cart.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/cart/dto/UpdateCartItemRequest.java

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UpdateCartItemRequest {

    @NotNull
    @Min(1)
    private Integer quantity;

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
