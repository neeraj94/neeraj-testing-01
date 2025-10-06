package com.example.rbac.activity.service;

import com.example.rbac.activity.model.ActivityLog;
import com.example.rbac.activity.repository.ActivityLogRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ActivityRecorder {

    private static final Logger log = LoggerFactory.getLogger(ActivityRecorder.class);

    private final ActivityLogRepository activityLogRepository;
    private final ObjectMapper objectMapper;

    public ActivityRecorder(ActivityLogRepository activityLogRepository, ObjectMapper objectMapper) {
        this.activityLogRepository = activityLogRepository;
        this.objectMapper = objectMapper;
    }

    public void record(String module, String activityType, String description) {
        record(module, activityType, description, null, null);
    }

    public void record(String module, String activityType, String description, String status, Map<String, ?> context) {
        recordInternal(module, activityType, description, status, context, resolveCurrentUser());
    }

    public void recordForUser(User user, String module, String activityType, String description, String status, Map<String, ?> context) {
        recordInternal(module, activityType, description, status, context, Optional.ofNullable(user));
    }

    @Transactional
    protected void recordInternal(String module,
                                  String activityType,
                                  String description,
                                  String status,
                                  Map<String, ?> context,
                                  Optional<User> userOverride) {
        try {
            ActivityLog logEntry = new ActivityLog();
            logEntry.setModuleName(normalize(module, "General"));
            logEntry.setActivityType(normalize(activityType, "UNKNOWN").toUpperCase(Locale.ROOT));
            logEntry.setDescription(normalize(description, ""));
            logEntry.setStatus(normalize(status, "SUCCESS").toUpperCase(Locale.ROOT));
            if (context != null && !context.isEmpty()) {
                logEntry.setContext(serializeContext(context));
            }

            userOverride.or(this::resolveCurrentUser)
                    .ifPresentOrElse(user -> applyUserInfo(logEntry, user),
                            () -> applySystemUser(logEntry));

            applyRequestInfo(logEntry);

            activityLogRepository.save(logEntry);
        } catch (Exception ex) {
            log.warn("Failed to record activity log for module '{}' and activity '{}'", module, activityType, ex);
        }
    }

    private Optional<User> resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return Optional.ofNullable(userPrincipal.getUser());
        }
        if (principal instanceof User user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    private void applyUserInfo(ActivityLog logEntry, User user) {
        logEntry.setUserId(user.getId());
        logEntry.setUserName(normalize(user.getFullName(), user.getEmail()));
        logEntry.setUserRole(resolveRoles(user.getRoles().stream()
                .map(role -> normalize(role.getName(), role.getKey()))
                .collect(Collectors.toSet())));
        logEntry.setDepartment(null);
    }

    private void applySystemUser(ActivityLog logEntry) {
        logEntry.setUserId(null);
        logEntry.setUserName("System");
        logEntry.setUserRole(null);
        logEntry.setDepartment(null);
    }

    private void applyRequestInfo(ActivityLog logEntry) {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof ServletRequestAttributes servletAttributes)) {
            return;
        }
        HttpServletRequest request = servletAttributes.getRequest();
        if (request == null) {
            return;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr()
                : forwarded.split(",")[0].trim();
        if (ip != null && !ip.isBlank()) {
            logEntry.setIpAddress(ip.length() > 45 ? ip.substring(0, 45) : ip);
        }
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null && !userAgent.isBlank()) {
            logEntry.setDevice(userAgent.length() > 150 ? userAgent.substring(0, 150) : userAgent);
        }
    }

    private String serializeContext(Map<String, ?> context) {
        Map<String, ?> safeContext = sanitizeContext(context);
        try {
            return objectMapper.writeValueAsString(safeContext);
        } catch (JsonProcessingException ex) {
            log.debug("Failed to serialize activity context", ex);
            return null;
        }
    }

    private Map<String, ?> sanitizeContext(Map<String, ?> context) {
        if (context == null || context.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> sanitized = new HashMap<>();
        context.forEach((key, value) -> {
            if (key == null || key.isBlank() || value == null) {
                return;
            }
            sanitized.put(key, value);
        });
        return sanitized;
    }

    private String normalize(String value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? defaultValue : trimmed;
    }

    private String resolveRoles(Set<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return null;
        }
        return roles.stream()
                .filter(role -> role != null && !role.isBlank())
                .collect(Collectors.joining(", "));
    }
}
