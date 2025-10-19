package com.example.rbac.controllers.admin.badges;

import com.example.rbac.badges.dto.BadgeDto;
import com.example.rbac.badges.dto.BadgeRequest;
import com.example.rbac.badges.service.BadgeService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/badges")
public class BadgeController {

    private final BadgeService badgeService;

    public BadgeController(BadgeService badgeService) {
        this.badgeService = badgeService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BADGE_VIEW')")
    public PageResponse<BadgeDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                       @RequestParam(name = "size", defaultValue = "20") int size,
                                       @RequestParam(name = "search", required = false) String search) {
        return badgeService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BADGE_VIEW')")
    public BadgeDto get(@PathVariable("id") Long id) {
        return badgeService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BADGE_CREATE')")
    public BadgeDto create(@Valid @RequestBody BadgeRequest request) {
        return badgeService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BADGE_UPDATE')")
    public BadgeDto update(@PathVariable("id") Long id, @Valid @RequestBody BadgeRequest request) {
        return badgeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BADGE_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        badgeService.delete(id);
    }
}
