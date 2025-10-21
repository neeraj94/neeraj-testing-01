package com.example.rbac.common.security;

import com.example.rbac.common.web.PublicApiPaths;
import org.springframework.http.HttpMethod;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public final class PublicEndpointRegistry {

    private static final List<PublicEndpointDefinition> BASE_ENDPOINTS;

    static {
        ArrayList<PublicEndpointDefinition> endpoints = new ArrayList<>();
        addEndpoint(endpoints, null, "/api/v1/client/auth/**", "Client authentication entry points");
        addEndpoint(endpoints, null, "/api/v1/admin/auth/**", "Admin authentication entry points");
        addEndpoint(endpoints, null, "/api/v1/settings/theme", "Public storefront theming");
        addEndpoint(endpoints, null, "/swagger-ui.html", "OpenAPI UI entry point");
        addEndpoint(endpoints, null, "/swagger-ui/**", "OpenAPI UI assets");
        addEndpoint(endpoints, null, "/v3/api-docs/**", "OpenAPI JSON documents");
        addEndpoint(endpoints, null, "/api/v1/blog/public/**", "Published blog content");
        addEndpoint(endpoints, null, "/api/v1/blog/media/**", "Public blog media files");
        addEndpoint(endpoints, null, "/api/v1/public/catalog/**", "Public catalog browsing");
        addEndpoint(endpoints, null, "/api/v1/public/coupons/**", "Public coupon lookups");
        addEndpoint(endpoints, null, "/api/v1/public/products/**", "Public product browsing");
        addEndpoint(endpoints, HttpMethod.GET, "/api/v1/brands/assets/**", "Brand media assets");
        addEndpoint(endpoints, HttpMethod.GET, "/api/v1/categories/assets/**", "Category media assets");
        addEndpoint(endpoints, HttpMethod.GET, "/api/v1/badge-categories/assets/**", "Badge category assets");
        addEndpoint(endpoints, HttpMethod.GET, "/api/v1/badges/assets/**", "Badge media assets");
        addEndpoint(endpoints, HttpMethod.GET, "/api/v1/products/assets/**", "Product media assets");
        addEndpoint(endpoints, HttpMethod.GET, "/api/v1/uploaded-files/assets/**", "Uploaded file assets");
        BASE_ENDPOINTS = List.copyOf(endpoints);
    }

    private static final CopyOnWriteArrayList<PublicEndpointDefinition> PUBLIC_ENDPOINTS = new CopyOnWriteArrayList<>(BASE_ENDPOINTS);

    private PublicEndpointRegistry() {
    }

    public static List<PublicEndpointDefinition> getEndpoints() {
        return List.copyOf(PUBLIC_ENDPOINTS);
    }

    public static void replaceDynamicEndpoints(Collection<PublicEndpointDefinition> dynamicEndpoints) {
        List<PublicEndpointDefinition> merged = new ArrayList<>(BASE_ENDPOINTS.size() + dynamicEndpoints.size());
        merged.addAll(BASE_ENDPOINTS);
        merged.addAll(dynamicEndpoints);
        PUBLIC_ENDPOINTS.clear();
        PUBLIC_ENDPOINTS.addAll(merged);
    }

    private static void addEndpoint(List<PublicEndpointDefinition> endpoints,
                                    HttpMethod method,
                                    String pattern,
                                    String description) {
        endpoints.add(new PublicEndpointDefinition(method, pattern, description));
        String clientVariant = PublicApiPaths.clientVariant(pattern);
        if (clientVariant != null && !clientVariant.equals(pattern)) {
            endpoints.add(new PublicEndpointDefinition(method, clientVariant, description + " (client namespace)"));
        }
    }
}
