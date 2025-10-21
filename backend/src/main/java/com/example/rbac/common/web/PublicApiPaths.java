package com.example.rbac.common.web;

/**
 * Utility helpers for exposing public API endpoints under both the generic
 * storefront namespace and the client-prefixed namespace expected by the
 * front-end HTTP client.
 */
public final class PublicApiPaths {

    private static final String API_PREFIX = "/api/v1";
    private static final String CLIENT_PREFIX = API_PREFIX + "/client";

    private PublicApiPaths() {
    }

    /**
     * Returns the primary and client-prefixed variants for a public endpoint
     * that lives beneath the {@code /api/v1} namespace.
     *
     * @param relativePath the portion of the path that comes after {@code /api/v1}
     * @return an array containing the canonical and client-prefixed variants
     */
    public static String[] expose(String relativePath) {
        String normalized = normalize(relativePath);
        String primary = API_PREFIX + normalized;
        String clientVariant = clientVariant(primary);
        if (primary.equals(clientVariant)) {
            return new String[]{primary};
        }
        return new String[]{primary, clientVariant};
    }

    /**
     * Generates the client-prefixed variant for an absolute path.
     *
     * @param absolutePath an absolute path beginning with {@code /api/v1}
     * @return the client-prefixed variant if applicable; otherwise the original path
     */
    public static String clientVariant(String absolutePath) {
        if (absolutePath == null) {
            return null;
        }
        if (!absolutePath.startsWith(API_PREFIX + "/")) {
            return absolutePath;
        }
        String suffix = absolutePath.substring(API_PREFIX.length());
        if (suffix.startsWith("/client/")) {
            return absolutePath;
        }
        return CLIENT_PREFIX + suffix;
    }

    private static String normalize(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return "";
        }
        String trimmed = relativePath.trim();
        return trimmed.startsWith("/") ? trimmed : "/" + trimmed;
    }
}
