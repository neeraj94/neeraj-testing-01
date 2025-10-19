package com.example.rbac.controllers.endcustomer.auth;

import com.example.rbac.auth.dto.RefreshTokenRequest;
import com.example.rbac.auth.service.AuthService;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/end-customer/auth")
public class RoleAuthController {

    private final AuthService authService;

    public RoleAuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.currentUser(principal.getUser());
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public void logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request);
    }
}
