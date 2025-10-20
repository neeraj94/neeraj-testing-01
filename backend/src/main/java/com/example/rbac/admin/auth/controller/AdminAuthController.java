package com.example.rbac.admin.auth.controller;

import com.example.rbac.admin.auth.dto.AdminLoginRequest;
import com.example.rbac.admin.auth.dto.AdminRefreshTokenRequest;
import com.example.rbac.client.auth.dto.AuthResponse;
import com.example.rbac.client.auth.dto.LoginRequest;
import com.example.rbac.client.auth.dto.RefreshTokenRequest;
import com.example.rbac.client.auth.service.AuthService;
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

    private final AuthService authService;

    public AdminAuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AdminLoginRequest request) {
        LoginRequest delegate = new LoginRequest();
        delegate.setEmail(request.getEmail());
        delegate.setPassword(request.getPassword());
        return authService.login(delegate);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody AdminRefreshTokenRequest request) {
        RefreshTokenRequest delegate = new RefreshTokenRequest();
        delegate.setRefreshToken(request.getRefreshToken());
        return authService.refresh(delegate);
    }

    @PostMapping("/logout")
    public void logout(@Valid @RequestBody AdminRefreshTokenRequest request) {
        RefreshTokenRequest delegate = new RefreshTokenRequest();
        delegate.setRefreshToken(request.getRefreshToken());
        authService.logout(delegate);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.currentUser(principal.getUser());
    }
}
