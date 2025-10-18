package com.example.rbac.cart.repository;

import com.example.rbac.cart.dto.CartSortOption;
import com.example.rbac.cart.dto.CartSummaryRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CartRepositoryCustom {

    Page<CartSummaryRow> searchActiveCartSummaries(String searchPattern, CartSortOption sortOption, Pageable pageable);
}
