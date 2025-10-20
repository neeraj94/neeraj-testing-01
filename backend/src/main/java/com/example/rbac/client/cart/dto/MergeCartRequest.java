<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/cart/dto/MergeCartRequest.java
package com.example.rbac.client.cart.dto;
========
package com.example.rbac.admin.cart.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/cart/dto/MergeCartRequest.java

import jakarta.validation.Valid;

import java.util.ArrayList;
import java.util.List;

public class MergeCartRequest {

    @Valid
    private List<GuestCartLineRequest> items = new ArrayList<>();

    public List<GuestCartLineRequest> getItems() {
        return items;
    }

    public void setItems(List<GuestCartLineRequest> items) {
        this.items = items;
    }
}
