package com.example.rbac.setup.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.setup.dto.MenuLayoutResponse;
import com.example.rbac.setup.dto.MenuLayoutUpdateRequest;
import com.example.rbac.setup.dto.MenuNodeConfigDto;
import com.example.rbac.setup.dto.MenuNodeDto;
import com.example.rbac.setup.dto.NavigationMenuResponse;
import com.example.rbac.setup.model.MenuLayout;
import com.example.rbac.setup.repository.MenuLayoutRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class SetupService {

    private static final Logger log = LoggerFactory.getLogger(SetupService.class);
    private static final String LAYOUT_KEY = "PRIMARY";

    private final MenuLayoutRepository menuLayoutRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ActivityRecorder activityRecorder;

    public SetupService(MenuLayoutRepository menuLayoutRepository,
                        UserRepository userRepository,
                        ObjectMapper objectMapper,
                        ActivityRecorder activityRecorder) {
        this.menuLayoutRepository = menuLayoutRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.activityRecorder = activityRecorder;
    }

    public NavigationMenuResponse getNavigationMenu() {
        List<MenuNodeConfig> stored = loadStoredLayout();
        List<MenuNodeDto> applied = mergeLayout(stored, DEFAULT_MENU);
        List<MenuNodeDto> defaults = mergeLayout(Collections.emptyList(), DEFAULT_MENU);

        NavigationMenuResponse response = new NavigationMenuResponse();
        response.setMenu(applied);
        response.setDefaults(defaults);
        return response;
    }

    public MenuLayoutResponse getSetupLayout() {
        List<MenuNodeConfig> stored = loadStoredLayout();
        List<MenuNodeDto> applied = mergeLayout(stored, DEFAULT_MENU);
        List<MenuNodeDto> defaults = mergeLayout(Collections.emptyList(), DEFAULT_MENU);

        MenuLayoutResponse response = new MenuLayoutResponse();
        response.setLayout(applied);
        response.setDefaults(defaults);

        menuLayoutRepository.findByLayoutKey(LAYOUT_KEY).ifPresent(layout -> {
            response.setUpdatedAt(layout.getUpdatedAt());
            if (layout.getUpdatedByUserId() != null) {
                Optional<User> user = userRepository.findById(layout.getUpdatedByUserId());
                user.map(User::getFullName).ifPresent(response::setUpdatedBy);
            }
        });

        return response;
    }

    @Transactional
    public MenuLayoutResponse updateLayout(MenuLayoutUpdateRequest request, UserPrincipal principal) {
        List<MenuNodeConfig> sanitized = sanitize(request != null ? request.getLayout() : null, DEFAULT_MENU);
        String serialized = writeLayout(sanitized);

        MenuLayout layout = menuLayoutRepository.findByLayoutKey(LAYOUT_KEY)
                .orElseGet(() -> {
                    MenuLayout created = new MenuLayout();
                    created.setLayoutKey(LAYOUT_KEY);
                    created.setStructureJson("[]");
                    return created;
                });

        boolean changed = !serialized.equals(layout.getStructureJson());
        layout.setStructureJson(serialized);
        if (principal != null) {
            layout.setUpdatedByUserId(principal.getUser().getId());
        }
        MenuLayout saved = menuLayoutRepository.save(layout);

        if (changed) {
            Map<String, Object> context = Map.of(
                    "nodeCount", sanitized.size(),
                    "updatedAt", Instant.now().toString()
            );
            activityRecorder.record("Setup", "UPDATE", "Updated navigation layout", "SUCCESS", context);
        }

        List<MenuNodeConfig> stored = parseLayout(saved.getStructureJson());
        List<MenuNodeDto> applied = mergeLayout(stored, DEFAULT_MENU);
        List<MenuNodeDto> defaults = mergeLayout(Collections.emptyList(), DEFAULT_MENU);

        MenuLayoutResponse response = new MenuLayoutResponse();
        response.setLayout(applied);
        response.setDefaults(defaults);
        response.setUpdatedAt(saved.getUpdatedAt());
        if (saved.getUpdatedByUserId() != null) {
            userRepository.findById(saved.getUpdatedByUserId())
                    .map(User::getFullName)
                    .ifPresent(response::setUpdatedBy);
        }
        return response;
    }

    private List<MenuNodeConfig> loadStoredLayout() {
        return menuLayoutRepository.findByLayoutKey(LAYOUT_KEY)
                .map(MenuLayout::getStructureJson)
                .map(this::parseLayout)
                .orElse(Collections.emptyList());
    }

    private List<MenuNodeConfig> parseLayout(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<MenuNodeConfig>>() {
            });
        } catch (IOException ex) {
            log.warn("Unable to parse stored menu layout: {}", json, ex);
            return Collections.emptyList();
        }
    }

    private String writeLayout(List<MenuNodeConfig> layout) {
        try {
            return objectMapper.writeValueAsString(layout);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to persist menu layout", ex);
        }
    }

    private List<MenuNodeDto> mergeLayout(List<MenuNodeConfig> stored, List<MenuDefinition> defaults) {
        List<MenuNodeDto> result = new ArrayList<>();
        if (defaults == null || defaults.isEmpty()) {
            return result;
        }

        Set<String> usedKeys = new LinkedHashSet<>();
        if (stored != null) {
            for (MenuNodeConfig node : stored) {
                MenuDefinition definition = findDefinitionByKey(defaults, node.getKey());
                if (definition == null || usedKeys.contains(definition.key())) {
                    continue;
                }
                result.add(toDto(definition, node.getChildren()));
                usedKeys.add(definition.key());
            }
        }

        for (MenuDefinition definition : defaults) {
            if (usedKeys.contains(definition.key())) {
                continue;
            }
            result.add(toDto(definition, null));
        }

        return result;
    }

    private MenuNodeDto toDto(MenuDefinition definition, List<MenuNodeConfig> storedChildren) {
        MenuNodeDto dto = new MenuNodeDto();
        dto.setKey(definition.key());
        dto.setLabel(definition.label());
        dto.setIcon(definition.icon());
        dto.setPath(definition.path());
        dto.setGroup(!definition.children().isEmpty());
        dto.setPermissions(new ArrayList<>(definition.permissions()));
        if (!definition.children().isEmpty()) {
            dto.setChildren(mergeLayout(storedChildren, definition.children()));
        } else {
            dto.setChildren(Collections.emptyList());
        }
        return dto;
    }

    private MenuDefinition findDefinitionByKey(List<MenuDefinition> definitions, String key) {
        if (key == null || definitions == null) {
            return null;
        }
        for (MenuDefinition definition : definitions) {
            if (definition.key().equals(key)) {
                return definition;
            }
        }
        return null;
    }

    private List<MenuNodeConfig> sanitize(List<MenuNodeConfigDto> requested, List<MenuDefinition> defaults) {
        if (requested == null || defaults == null) {
            return Collections.emptyList();
        }
        List<MenuNodeConfig> sanitized = new ArrayList<>();
        Set<String> usedKeys = new HashSet<>();
        for (MenuNodeConfigDto node : requested) {
            if (node == null) {
                continue;
            }
            MenuDefinition definition = findDefinitionByKey(defaults, node.getKey());
            if (definition == null || !usedKeys.add(definition.key())) {
                continue;
            }
            List<MenuNodeConfig> children = definition.children().isEmpty()
                    ? Collections.emptyList()
                    : sanitize(node.getChildren(), definition.children());
            sanitized.add(new MenuNodeConfig(definition.key(), children));
        }
        return sanitized;
    }

    private static final List<MenuDefinition> DEFAULT_MENU = List.of(
            MenuDefinition.item("dashboard", "Dashboard", "🏠", "/dashboard", List.of()),
            MenuDefinition.group("sales", "Sales", "⚡", List.of(
                    MenuDefinition.item(
                            "invoices",
                            "Invoices",
                            "📄",
                            "/invoices",
                            List.of("INVOICE_VIEW", "INVOICE_VIEW_GLOBAL", "INVOICE_VIEW_OWN", "INVOICE_CREATE", "INVOICE_UPDATE", "INVOICE_DELETE")
                    )
            )),
            MenuDefinition.group("access", "Access Control", "🔐", List.of(
                    MenuDefinition.item(
                            "users",
                            "Users",
                            "👥",
                            "/users",
                            List.of("USER_VIEW", "USER_VIEW_GLOBAL", "USER_VIEW_OWN", "USER_CREATE", "USER_UPDATE", "USER_DELETE")
                    ),
                    MenuDefinition.item(
                            "roles",
                            "Roles",
                            "🧩",
                            "/roles",
                            List.of("ROLE_VIEW", "ROLE_VIEW_GLOBAL", "ROLE_VIEW_OWN")
                    ),
                    MenuDefinition.item(
                            "permissions",
                            "Permissions",
                            "🛡️",
                            "/permissions",
                            List.of("PERMISSION_VIEW")
                    )
            )),
            MenuDefinition.item("activity", "Activity", "📝", "/activity", List.of("ACTIVITY_VIEW")),
            MenuDefinition.item("settings", "Settings", "⚙️", "/settings", List.of("SETTINGS_VIEW")),
            MenuDefinition.item("setup", "Setup", "🧭", "/setup", List.of("SETUP_MANAGE")),
            MenuDefinition.item("profile", "Profile", "👤", "/profile", List.of())
    );

    private record MenuDefinition(String key, String label, String icon, String path,
                                  List<String> permissions, List<MenuDefinition> children) {

        private static MenuDefinition item(String key, String label, String icon, String path, List<String> permissions) {
            return new MenuDefinition(key, label, icon, path, List.copyOf(permissions), List.of());
        }

        private static MenuDefinition group(String key, String label, String icon, List<MenuDefinition> children) {
            return new MenuDefinition(key, label, icon, null, List.of(), List.copyOf(children));
        }
    }

    private static class MenuNodeConfig {
        private String key;
        private List<MenuNodeConfig> children = new ArrayList<>();

        public MenuNodeConfig() {
        }

        public MenuNodeConfig(String key, List<MenuNodeConfig> children) {
            this.key = key;
            if (children != null) {
                this.children = new ArrayList<>(children);
            }
        }

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public List<MenuNodeConfig> getChildren() {
            return children;
        }

        public void setChildren(List<MenuNodeConfig> children) {
            this.children = children;
        }
    }
}
