package com.example.rbac.admin;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class AdminApiForwardingFilter extends OncePerRequestFilter {

    private static final String ADMIN_PREFIX = "/api/v1/admin";
    private static final String AUTH_PREFIX = ADMIN_PREFIX + "/auth";
    private static final String API_PREFIX = "/api/v1";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestUri = request.getRequestURI();
        if (!requestUri.startsWith(ADMIN_PREFIX) || requestUri.startsWith(AUTH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String stripped = API_PREFIX + requestUri.substring(ADMIN_PREFIX.length());
        HttpServletRequest wrapped = new AdminPathStrippingRequest(request, stripped);
        filterChain.doFilter(wrapped, response);
    }

    private static final class AdminPathStrippingRequest extends HttpServletRequestWrapper {

        private final String rewrittenPath;
        private final String contextPath;

        private AdminPathStrippingRequest(HttpServletRequest request, String rewrittenPath) {
            super(request);
            this.rewrittenPath = normalizePath(rewrittenPath);
            this.contextPath = request.getContextPath();
        }

        @Override
        public String getRequestURI() {
            return rewrittenPath;
        }

        @Override
        public StringBuffer getRequestURL() {
            StringBuffer original = super.getRequestURL();
            int index = original.indexOf(ADMIN_PREFIX);
            if (index >= 0) {
                original.replace(index, index + ADMIN_PREFIX.length(), API_PREFIX);
            }
            return original;
        }

        @Override
        public String getServletPath() {
            String servletPath = super.getServletPath();
            if (StringUtils.hasLength(servletPath) && servletPath.startsWith(ADMIN_PREFIX)) {
                return servletPath.replaceFirst(ADMIN_PREFIX, API_PREFIX);
            }
            return servletPath;
        }

        @Override
        public String getPathInfo() {
            String pathInfo = super.getPathInfo();
            if (StringUtils.hasLength(pathInfo) && pathInfo.startsWith(ADMIN_PREFIX)) {
                return pathInfo.replaceFirst(ADMIN_PREFIX, API_PREFIX);
            }
            return pathInfo;
        }

        @Override
        public String getContextPath() {
            return contextPath;
        }

        private static String normalizePath(String path) {
            if (!StringUtils.hasLength(path)) {
                return API_PREFIX;
            }
            if (path.equals(API_PREFIX)) {
                return path;
            }
            if (path.startsWith(API_PREFIX + "/")) {
                return path;
            }
            if (path.startsWith("/")) {
                return API_PREFIX + path.substring(1);
            }
            return API_PREFIX + "/" + path;
        }
    }
}
