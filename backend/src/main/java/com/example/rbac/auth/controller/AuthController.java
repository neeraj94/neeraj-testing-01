package com.example.rbac.auth.controller;

import com.example.rbac.auth.dto.AuthResponse;
import com.example.rbac.auth.dto.LoginRequest;
import com.example.rbac.auth.dto.RefreshTokenRequest;
import com.example.rbac.auth.dto.SignupRequest;
import com.example.rbac.auth.service.AuthService;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    public void logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.currentUser(principal.getUser());
    }
}
