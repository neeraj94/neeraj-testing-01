package com.example.rbac.publicapi.settings.controller;

import com.example.rbac.admin.settings.dto.SettingsThemeDto;
import com.example.rbac.admin.settings.service.SettingsService;
import com.example.rbac.common.security.PublicEndpoint;
import com.example.rbac.common.web.PublicApiPaths;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PublicEndpoint("Storefront theme settings")
@RequestMapping(PublicApiPaths.expose("/settings"))
public class SettingsThemeController {

    private final SettingsService settingsService;

    public SettingsThemeController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/theme")
    @PreAuthorize("permitAll()")
    public SettingsThemeDto getTheme() {
        return settingsService.getTheme();
    }
}
