package com.example.rbac.cart.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

public record CartSummaryRow(
        Long cartId,
        Long userId,
        String userName,
        String userEmail,
        Instant updatedAt,
        BigDecimal totalValue,
        Long totalQuantity
) {

    public BigDecimal subtotal() {
        if (totalValue == null) {
            return BigDecimal.ZERO;
        }
        return totalValue.setScale(2, RoundingMode.HALF_UP);
    }

    public int quantity() {
        if (totalQuantity == null) {
            return 0;
        }
        return totalQuantity.intValue();
    }
}
