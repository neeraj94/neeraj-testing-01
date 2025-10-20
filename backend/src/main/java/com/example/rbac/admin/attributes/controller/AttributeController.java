package com.example.rbac.admin.attributes.controller;

import com.example.rbac.admin.attributes.dto.AttributeDto;
import com.example.rbac.admin.attributes.dto.AttributeRequest;
import com.example.rbac.admin.attributes.service.AttributeService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/attributes")
public class AttributeController {

    private final AttributeService attributeService;

    public AttributeController(AttributeService attributeService) {
        this.attributeService = attributeService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ATTRIBUTE_VIEW')")
    public PageResponse<AttributeDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                           @RequestParam(name = "size", defaultValue = "20") int size,
                                           @RequestParam(name = "search", required = false) String search) {
        return attributeService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ATTRIBUTE_VIEW')")
    public AttributeDto get(@PathVariable("id") Long id) {
        return attributeService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ATTRIBUTE_CREATE')")
    public AttributeDto create(@Valid @RequestBody AttributeRequest request) {
        return attributeService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ATTRIBUTE_UPDATE')")
    public AttributeDto update(@PathVariable("id") Long id, @Valid @RequestBody AttributeRequest request) {
        return attributeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ATTRIBUTE_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        attributeService.delete(id);
    }
}
