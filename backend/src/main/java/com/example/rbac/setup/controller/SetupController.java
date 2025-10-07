package com.example.rbac.setup.controller;

import com.example.rbac.setup.dto.MenuLayoutResponse;
import com.example.rbac.setup.dto.MenuLayoutUpdateRequest;
import com.example.rbac.setup.service.SetupService;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/setup")
public class SetupController {

    private final SetupService setupService;

    public SetupController(SetupService setupService) {
        this.setupService = setupService;
    }

    @GetMapping("/menu")
    @PreAuthorize("hasAuthority('SETUP_MANAGE')")
    public MenuLayoutResponse getMenuLayout(@AuthenticationPrincipal UserPrincipal principal) {
        return setupService.getSetupLayout(principal);
    }

    @PutMapping("/menu")
    @PreAuthorize("hasAuthority('SETUP_MANAGE')")
    public MenuLayoutResponse updateMenuLayout(@RequestBody MenuLayoutUpdateRequest request,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return setupService.updateLayout(request, principal);
    }
}
