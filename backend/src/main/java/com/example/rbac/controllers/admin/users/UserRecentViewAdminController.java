package com.example.rbac.controllers.admin.users;

import com.example.rbac.users.dto.UserRecentViewDto;
import com.example.rbac.users.service.UserRecentViewService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/admin/users")
public class UserRecentViewAdminController {

    private final UserRecentViewService userRecentViewService;

    public UserRecentViewAdminController(UserRecentViewService userRecentViewService) {
        this.userRecentViewService = userRecentViewService;
    }

    @GetMapping("/{userId}/recent-views")
    @PreAuthorize("@userPermissionEvaluator.canViewRecentActivity(#userId)")
    public List<UserRecentViewDto> listRecentViews(@PathVariable Long userId) {
        return userRecentViewService.getRecentViewsForUser(userId);
    }
}
