package com.example.rbac.wedges.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.wedges.dto.WedgeDto;
import com.example.rbac.wedges.dto.WedgeRequest;
import com.example.rbac.wedges.service.WedgeService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wedges")
public class WedgeController {

    private final WedgeService wedgeService;

    public WedgeController(WedgeService wedgeService) {
        this.wedgeService = wedgeService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('WEDGE_VIEW')")
    public PageResponse<WedgeDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                       @RequestParam(name = "size", defaultValue = "20") int size,
                                       @RequestParam(name = "search", required = false) String search) {
        return wedgeService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('WEDGE_VIEW')")
    public WedgeDto get(@PathVariable("id") Long id) {
        return wedgeService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('WEDGE_CREATE')")
    public WedgeDto create(@Valid @RequestBody WedgeRequest request) {
        return wedgeService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('WEDGE_UPDATE')")
    public WedgeDto update(@PathVariable("id") Long id, @Valid @RequestBody WedgeRequest request) {
        return wedgeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('WEDGE_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        wedgeService.delete(id);
    }
}
