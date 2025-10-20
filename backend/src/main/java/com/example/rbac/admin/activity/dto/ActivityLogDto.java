package com.example.rbac.admin.activity.dto;

import java.time.Instant;

public record ActivityLogDto(
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
        String device
) {
}
