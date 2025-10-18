package com.example.rbac.users.controller;

import com.example.rbac.users.dto.ProfileUpdateRequest;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {

    private final UserService userService;

    public ProfileController(UserService userService) {
        this.userService = userService;
    }

    @PutMapping
    @PreAuthorize("hasAuthority('CUSTOMER_PROFILE_MANAGE')")
    public UserDto updateProfile(@AuthenticationPrincipal UserPrincipal principal,
                                 @Valid @RequestBody ProfileUpdateRequest request) {
        return userService.updateProfile(principal.getUser(), request);
    }
}
