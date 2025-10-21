package com.example.rbac.admin.system.controller;

import com.example.rbac.common.security.PublicEndpointDefinition;
import com.example.rbac.common.security.PublicEndpointRegistry;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/system")
public class PublicEndpointAdminController {

    @GetMapping("/public-endpoints")
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('PERMISSION_VIEW')")
    public List<PublicEndpointSummary> listPublicEndpoints() {
        return PublicEndpointRegistry.getEndpoints().stream()
                .map(PublicEndpointSummary::from)
                .toList();
    }

    public record PublicEndpointSummary(String method, String pattern, String description) {
        public static PublicEndpointSummary from(PublicEndpointDefinition definition) {
            return new PublicEndpointSummary(definition.methodValue(), definition.pattern(), definition.description());
        }
    }
}
