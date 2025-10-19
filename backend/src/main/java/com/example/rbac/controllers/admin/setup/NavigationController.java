package com.example.rbac.controllers.admin.setup;

import com.example.rbac.setup.dto.NavigationMenuResponse;
import com.example.rbac.setup.service.SetupService;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/navigation")
public class NavigationController {

    private final SetupService setupService;

    public NavigationController(SetupService setupService) {
        this.setupService = setupService;
    }

    @GetMapping("/menu")
    @PreAuthorize("isAuthenticated()")
    public NavigationMenuResponse getNavigationMenu(@AuthenticationPrincipal UserPrincipal principal) {
        return setupService.getNavigationMenu(principal);
    }
}
