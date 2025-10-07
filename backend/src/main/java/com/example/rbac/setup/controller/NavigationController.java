package com.example.rbac.setup.controller;

import com.example.rbac.setup.dto.NavigationMenuResponse;
import com.example.rbac.setup.service.SetupService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/navigation")
public class NavigationController {

    private final SetupService setupService;

    public NavigationController(SetupService setupService) {
        this.setupService = setupService;
    }

    @GetMapping("/menu")
    @PreAuthorize("isAuthenticated()")
    public NavigationMenuResponse getNavigationMenu() {
        return setupService.getNavigationMenu();
    }
}
