package com.example.rbac.common.security;

import org.springframework.http.HttpMethod;

import java.util.List;

public final class PublicEndpointRegistry {

    private static final List<PublicEndpointDefinition> PUBLIC_ENDPOINTS = List.of(
            new PublicEndpointDefinition(null, "/api/v1/client/auth/**", "Client authentication entry points"),
            new PublicEndpointDefinition(null, "/api/v1/admin/auth/**", "Admin authentication entry points"),
            new PublicEndpointDefinition(null, "/api/v1/settings/theme", "Public storefront theming"),
            new PublicEndpointDefinition(null, "/swagger-ui.html", "OpenAPI UI entry point"),
            new PublicEndpointDefinition(null, "/swagger-ui/**", "OpenAPI UI assets"),
            new PublicEndpointDefinition(null, "/v3/api-docs/**", "OpenAPI JSON documents"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/blog/public/**", "Published blog content"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/blog/media/**", "Public blog media files"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/public/catalog/**", "Public catalog browsing"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/public/coupons/**", "Public coupon lookups"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/public/products/**", "Public product browsing"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/brands/assets/**", "Brand media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/categories/assets/**", "Category media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/badge-categories/assets/**", "Badge category assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/badges/assets/**", "Badge media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/products/assets/**", "Product media assets"),
            new PublicEndpointDefinition(HttpMethod.GET, "/api/v1/uploaded-files/assets/**", "Uploaded file assets")
    );

    private PublicEndpointRegistry() {
    }

    public static List<PublicEndpointDefinition> getEndpoints() {
        return PUBLIC_ENDPOINTS;
    }
}
