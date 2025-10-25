package com.example.rbac.admin.config.status.dto;

import java.util.List;

public record StatusDetailDto(
        Long id,
        String type,
        String name,
        String code,
        String icon,
        String colorHex,
        String description,
        boolean isDefault,
        boolean isActive,
        Boolean visibleToCustomer,
        Integer sortOrder,
        List<Long> allowedTransitionIds
) {
}
