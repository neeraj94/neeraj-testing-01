<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/cart/repository/CartRepositoryCustom.java
package com.example.rbac.client.cart.repository;
========
package com.example.rbac.admin.cart.repository;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/cart/repository/CartRepositoryCustom.java

import com.example.rbac.admin.cart.dto.CartSortOption;
import com.example.rbac.admin.cart.dto.CartSummaryRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CartRepositoryCustom {

    Page<CartSummaryRow> searchActiveCartSummaries(String searchPattern, CartSortOption sortOption, Pageable pageable);
}
