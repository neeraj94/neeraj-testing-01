package com.example.rbac.admin.cart.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

public class CartSummaryRow {

    private final Long cartId;
    private final Long userId;
    private final String userName;
    private final String userEmail;
    private final Instant updatedAt;
    private final BigDecimal totalValue;
    private final Long totalQuantity;

    public CartSummaryRow(
            Long cartId,
            Long userId,
            String userName,
            String userEmail,
            Instant updatedAt,
            Number totalValue,
            Number totalQuantity
    ) {
        this.cartId = cartId;
        this.userId = userId;
        this.userName = userName;
        this.userEmail = userEmail;
        this.updatedAt = updatedAt;
        this.totalValue = normalizeTotalValue(totalValue);
        this.totalQuantity = totalQuantity == null ? null : totalQuantity.longValue();
    }

    private static BigDecimal normalizeTotalValue(Number totalValue) {
        if (totalValue == null) {
            return null;
        }
        if (totalValue instanceof BigDecimal bd) {
            return bd;
        }
        if (totalValue instanceof Long || totalValue instanceof Integer || totalValue instanceof Short) {
            return BigDecimal.valueOf(totalValue.longValue());
        }
        if (totalValue instanceof Double || totalValue instanceof Float) {
            return BigDecimal.valueOf(totalValue.doubleValue());
        }
        return new BigDecimal(totalValue.toString());
    }

    public Long cartId() {
        return cartId;
    }

    public Long userId() {
        return userId;
    }

    public String userName() {
        return userName;
    }

    public String userEmail() {
        return userEmail;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    public BigDecimal totalValue() {
        return totalValue;
    }

    public Long totalQuantity() {
        return totalQuantity;
    }

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
