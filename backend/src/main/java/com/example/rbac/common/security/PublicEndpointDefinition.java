package com.example.rbac.common.security;

import org.springframework.http.HttpMethod;

public record PublicEndpointDefinition(HttpMethod method, String pattern, String description) {
    public boolean matchesAllMethods() {
        return method == null;
    }

    public String methodValue() {
        return method == null ? "ALL" : method.name();
    }
}
