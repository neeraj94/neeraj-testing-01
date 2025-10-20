package com.example.rbac.client.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class VerificationRequest {

    @NotBlank
    private String token;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
