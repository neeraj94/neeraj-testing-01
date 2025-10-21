package com.example.rbac.publicapi.system.controller;

import com.example.rbac.common.security.PublicEndpoint;
import com.example.rbac.common.security.PublicEndpointDefinition;
import com.example.rbac.common.security.PublicEndpointRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PublicEndpoint("Public endpoint catalog")
public class PublicEndpointController {

    @GetMapping("/api/public/endpoints")
    public ResponseEntity<List<PublicEndpointDefinition>> list() {
        return ResponseEntity.ok(PublicEndpointRegistry.getEndpoints());
    }
}
