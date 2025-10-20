package com.example.rbac.admin.auth.controller;

import com.example.rbac.admin.auth.dto.AdminLoginRequest;
import com.example.rbac.admin.auth.dto.AdminRefreshTokenRequest;
import com.example.rbac.admin.auth.service.AdminAuthService;
import com.example.rbac.common.auth.dto.AuthResponse;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AdminAuthController {

    private final AdminAuthService authService;

    public AdminAuthController(AdminAuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AdminLoginRequest request) {
        return authService.login(request.getEmail(), request.getPassword());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody AdminRefreshTokenRequest request) {
        return authService.refresh(request.getRefreshToken());
    }

    @PostMapping("/logout")
    public void logout(@Valid @RequestBody AdminRefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.currentUser(principal.getUser());
    }
}
