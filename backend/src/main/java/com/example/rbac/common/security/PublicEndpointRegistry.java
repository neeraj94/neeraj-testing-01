package com.example.rbac.common.security;

import org.springframework.http.HttpMethod;

import java.util.List;

public final class PublicEndpointRegistry {

    private static final List<PublicEndpointDefinition> PUBLIC_ENDPOINTS = List.of(
            new PublicEndpointDefinition(null, "/api/publicapi/auth/**", "Authentication entry points (login, refresh, register, verification)"),
            new PublicEndpointDefinition(null, "/api/publicapi/settings/theme", "Public storefront theming"),
            new PublicEndpointDefinition(null, "/swagger-ui.html", "OpenAPI UI entry point"),
            new PublicEndpointDefinition(null, "/swagger-ui/**", "OpenAPI UI assets"),
            new PublicEndpointDefinition(null, "/v3/api-docs/**", "OpenAPI JSON documents"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/blog/**", "Published blog content"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/blog/media/**", "Public blog media files"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/catalog/**", "Public catalog browsing"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/coupons/**", "Public coupon lookups"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/products/**", "Public product browsing"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/brands/assets/**", "Brand media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/categories/assets/**", "Category media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/badge-categories/assets/**", "Badge category assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/badges/assets/**", "Badge media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/products/assets/**", "Product media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/publicapi/uploaded-files/assets/**", "Uploaded file assets")
    );

    private PublicEndpointRegistry() {
    }

    public static List<PublicEndpointDefinition> getEndpoints() {
        return PUBLIC_ENDPOINTS;
    }
}
