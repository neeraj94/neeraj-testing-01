package com.example.rbac.client.auth.controller;

import com.example.rbac.common.auth.dto.AuthResponse;
import com.example.rbac.client.auth.dto.LoginRequest;
import com.example.rbac.client.auth.dto.RefreshTokenRequest;
import com.example.rbac.client.auth.dto.SignupRequest;
import com.example.rbac.client.auth.dto.SignupResponse;
import com.example.rbac.client.auth.dto.VerificationRequest;
import com.example.rbac.client.auth.dto.VerificationResponse;
import com.example.rbac.client.auth.service.ClientAuthService;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final ClientAuthService authService;

    public AuthController(ClientAuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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
