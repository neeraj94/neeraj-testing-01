package com.example.rbac.admin.activity.mapper;

import com.example.rbac.admin.activity.dto.ActivityLogDetailDto;
import com.example.rbac.admin.activity.dto.ActivityLogDto;
import com.example.rbac.admin.activity.model.ActivityLog;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ActivityLogMapper {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public ActivityLogMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ActivityLogDto toDto(ActivityLog log) {
        if (log == null) {
            return null;
        }
        return new ActivityLogDto(
                log.getId(),
                log.getOccurredAt(),
                log.getUserId(),
                log.getUserName(),
                log.getUserRole(),
                log.getDepartment(),
                log.getModuleName(),
                log.getActivityType(),
                log.getDescription(),
                log.getStatus(),
                log.getIpAddress(),
                log.getDevice()
        );
    }

    public ActivityLogDetailDto toDetail(ActivityLog log) {
        if (log == null) {
            return null;
        }
        Map<String, Object> context = null;
        if (log.getContext() != null) {
            try {
                context = objectMapper.readValue(log.getContext(), MAP_TYPE);
            } catch (JsonProcessingException ignored) {
                context = null;
            }
        }
        return new ActivityLogDetailDto(
                log.getId(),
                log.getOccurredAt(),
                log.getUserId(),
                log.getUserName(),
                log.getUserRole(),
                log.getDepartment(),
                log.getModuleName(),
                log.getActivityType(),
                log.getDescription(),
                log.getStatus(),
                log.getIpAddress(),
                log.getDevice(),
                context,
                log.getContext()
        );
    }
}
