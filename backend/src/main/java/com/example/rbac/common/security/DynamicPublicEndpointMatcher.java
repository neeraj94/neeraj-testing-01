package com.example.rbac.common.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.PathContainer;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

import java.util.List;

/**
 * Request matcher that checks incoming requests against the dynamically
 * discovered public endpoint registry. This allows Spring Security to
 * evaluate the latest set of @PublicEndpoint mappings without needing to
 * rebuild the security filter chain whenever new endpoints are registered.
 */
public class DynamicPublicEndpointMatcher implements RequestMatcher {

    private final PathPatternParser parser = new PathPatternParser();

    @Override
    public boolean matches(HttpServletRequest request) {
        String path = request.getRequestURI();
        String requestMethod = request.getMethod();
        List<PublicEndpointDefinition> endpoints = PublicEndpointRegistry.getEndpoints();
        for (PublicEndpointDefinition endpoint : endpoints) {
            if (!endpoint.matchesAllMethods()) {
                HttpMethod endpointMethod = endpoint.method();
                if (endpointMethod == null) {
                    continue;
                }
                if (requestMethod == null || !endpointMethod.name().equalsIgnoreCase(requestMethod)) {
                    continue;
                }
            }
            try {
                PathPattern pattern = parser.parse(endpoint.pattern());
                if (pattern.matches(PathContainer.parsePath(path))) {
                    return true;
                }
            } catch (IllegalArgumentException ignored) {
                // Skip invalid patterns rather than failing the request.
            }
        }
        return false;
    }
}
