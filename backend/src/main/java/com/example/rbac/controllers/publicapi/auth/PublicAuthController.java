package com.example.rbac.controllers.publicapi.auth;

import com.example.rbac.auth.dto.AuthResponse;
import com.example.rbac.auth.dto.LoginRequest;
import com.example.rbac.auth.dto.RefreshTokenRequest;
import com.example.rbac.auth.dto.SignupRequest;
import com.example.rbac.auth.dto.VerificationRequest;
import com.example.rbac.auth.dto.VerificationResponse;
import com.example.rbac.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/auth")
public class PublicAuthController {

    private final AuthService authService;

    public PublicAuthController(AuthService authService) {
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
