package com.example.rbac.client.cart.repository;

import com.example.rbac.admin.cart.dto.CartSortOption;
import com.example.rbac.admin.cart.dto.CartSummaryRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CartRepositoryCustom {

    Page<CartSummaryRow> searchActiveCartSummaries(String searchPattern, CartSortOption sortOption, Pageable pageable);
}
