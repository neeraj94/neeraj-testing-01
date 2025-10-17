package com.example.rbac.checkout.repository;

import com.example.rbac.checkout.model.CheckoutOrder;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.Instant;

public final class CheckoutOrderSpecifications {

    private CheckoutOrderSpecifications() {
    }

    public static Specification<CheckoutOrder> search(String term) {
        if (!StringUtils.hasText(term)) {
            return null;
        }
        String like = "%" + term.trim().toLowerCase() + "%";
        return (root, query, builder) -> builder.or(
                builder.like(builder.lower(root.get("orderNumber")), like),
                builder.like(builder.lower(root.get("customerName")), like),
                builder.like(builder.lower(root.get("customerEmail")), like)
        );
    }

    public static Specification<CheckoutOrder> hasStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return null;
        }
        return (root, query, builder) -> builder.equal(builder.lower(root.get("status")), status.trim().toLowerCase());
    }

    public static Specification<CheckoutOrder> paymentMethodContains(String paymentMethodKey) {
        if (!StringUtils.hasText(paymentMethodKey)) {
            return null;
        }
        String normalized = paymentMethodKey.trim().toLowerCase();
        return (root, query, builder) -> builder.like(builder.lower(root.get("paymentMethodKey")), "%" + normalized + "%");
    }

    public static Specification<CheckoutOrder> placedOnOrAfter(Instant from) {
        if (from == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<CheckoutOrder> placedOnOrBefore(Instant to) {
        if (to == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get("createdAt"), to);
    }
}
