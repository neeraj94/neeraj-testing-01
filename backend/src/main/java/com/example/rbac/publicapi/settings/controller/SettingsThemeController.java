package com.example.rbac.publicapi.settings.controller;

import com.example.rbac.admin.settings.dto.SettingsThemeDto;
import com.example.rbac.admin.settings.service.SettingsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings")
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
