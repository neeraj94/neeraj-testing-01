package com.example.rbac.client.auth.controller;

import com.example.rbac.client.auth.dto.AuthResponse;
import com.example.rbac.client.auth.dto.LoginRequest;
import com.example.rbac.client.auth.dto.RefreshTokenRequest;
import com.example.rbac.client.auth.dto.SignupRequest;
import com.example.rbac.client.auth.dto.VerificationRequest;
import com.example.rbac.client.auth.dto.VerificationResponse;
import com.example.rbac.client.auth.service.AuthService;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/client/auth")
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

    @PostMapping("/verify")
    public VerificationResponse verify(@Valid @RequestBody VerificationRequest request) {
        return authService.verifyEmail(request);
    }

    @GetMapping("/verify")
    public VerificationResponse verify(@RequestParam("token") String token) {
        VerificationRequest request = new VerificationRequest();
        request.setToken(token);
        return authService.verifyEmail(request);
    }
}
