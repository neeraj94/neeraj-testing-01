package com.example.rbac.admin.activity.dto;

import java.time.Instant;
import java.util.Map;

public record ActivityLogDetailDto(
        Long id,
        Instant occurredAt,
        Long userId,
        String userName,
        String userRole,
        String department,
        String module,
        String activityType,
        String description,
        String status,
        String ipAddress,
        String device,
        Map<String, Object> context,
        String rawContext
) {
}
