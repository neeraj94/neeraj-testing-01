package com.example.rbac.admin.activity.service;

import com.example.rbac.admin.activity.model.ActivityLog;
import com.example.rbac.admin.activity.repository.ActivityLogRepository;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.model.UserPrincipal;
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

        String ip = extractClientIp(request);
        if (ip != null && !ip.isBlank()) {
            logEntry.setIpAddress(ip);
        }

        String device = extractDeviceInfo(request.getHeader("User-Agent"));
        if (device != null && !device.isBlank()) {
            logEntry.setDevice(device);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        String candidate = resolveFirstAddress(forwardedFor);
        if (candidate != null) {
            return candidate;
        }
        String realIp = request.getHeader("X-Real-IP");
        candidate = resolveFirstAddress(realIp);
        if (candidate != null) {
            return candidate;
        }
        return normalizeIp(request.getRemoteAddr());
    }

    private String resolveFirstAddress(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            return null;
        }
        String[] segments = headerValue.split(",");
        for (String segment : segments) {
            String candidate = segment.trim();
            if (!candidate.isEmpty() && !"unknown".equalsIgnoreCase(candidate)) {
                return normalizeIp(candidate);
            }
        }
        return null;
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return null;
        }
        String cleaned = ip.trim();
        if (cleaned.startsWith("::ffff:")) {
            cleaned = cleaned.substring(7);
        }
        if ("::1".equals(cleaned) || "0:0:0:0:0:0:0:1".equals(cleaned)) {
            cleaned = "127.0.0.1";
        }
        if (cleaned.contains(".") && cleaned.contains(":") && !cleaned.contains("::")) {
            cleaned = cleaned.substring(0, cleaned.indexOf(':'));
        }
        int scopeIndex = cleaned.indexOf('%');
        if (scopeIndex > -1) {
            cleaned = cleaned.substring(0, scopeIndex);
        }
        return cleaned.length() > 45 ? cleaned.substring(0, 45) : cleaned;
    }

    private String extractDeviceInfo(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        String browser = detectBrowser(userAgent);
        String operatingSystem = detectOperatingSystem(userAgent);
        StringBuilder builder = new StringBuilder();
        if (browser != null) {
            builder.append(browser);
        }
        if (operatingSystem != null) {
            if (builder.length() > 0) {
                builder.append(" on ");
            }
            builder.append(operatingSystem);
        }
        String description = builder.length() > 0 ? builder.toString() : userAgent.trim();
        return description.length() > 150 ? description.substring(0, 150) : description;
    }

    private String detectBrowser(String userAgent) {
        String normalized = userAgent.toLowerCase(Locale.ROOT);
        if (normalized.contains("edg/")) {
            return "Microsoft Edge";
        }
        if (normalized.contains("chrome/") && !normalized.contains("chromium") && !normalized.contains("edg/") && !normalized.contains("opr/")) {
            return "Google Chrome";
        }
        if (normalized.contains("safari/") && normalized.contains("version/") && !normalized.contains("chrome/")) {
            return "Safari";
        }
        if (normalized.contains("firefox/")) {
            return "Mozilla Firefox";
        }
        if (normalized.contains("opr/") || normalized.contains("opera")) {
            return "Opera";
        }
        if (normalized.contains("msie") || normalized.contains("trident/")) {
            return "Internet Explorer";
        }
        return null;
    }

    private String detectOperatingSystem(String userAgent) {
        String normalized = userAgent.toLowerCase(Locale.ROOT);
        if (normalized.contains("iphone") || normalized.contains("ipad")) {
            return "iOS";
        }
        if (normalized.contains("windows nt 10") || normalized.contains("windows nt 11")) {
            return "Windows";
        }
        if (normalized.contains("mac os x") || normalized.contains("macintosh")) {
            return "macOS";
        }
        if (normalized.contains("cros")) {
            return "ChromeOS";
        }
        if (normalized.contains("android")) {
            return "Android";
        }
        if (normalized.contains("linux")) {
            return "Linux";
        }
        return null;
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
