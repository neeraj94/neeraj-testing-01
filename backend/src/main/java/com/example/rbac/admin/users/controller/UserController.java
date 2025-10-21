package com.example.rbac.admin.users.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.users.dto.AssignRolesRequest;
import com.example.rbac.admin.users.dto.CreateUserRequest;
import com.example.rbac.admin.users.dto.UpdateUserRequest;
import com.example.rbac.admin.users.dto.UpdateUserPermissionsRequest;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.dto.UserSummaryResponse;
import com.example.rbac.admin.users.dto.UpdateUserStatusRequest;
import com.example.rbac.admin.users.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public PageResponse<UserDto> list(@RequestParam(name = "search", required = false) String search,
                                      @RequestParam(name = "page", defaultValue = "0") int page,
                                      @RequestParam(name = "size", defaultValue = "20") int size,
                                      @RequestParam(name = "sort", defaultValue = "name") String sort,
                                      @RequestParam(name = "direction", defaultValue = "asc") String direction,
                                      @RequestParam(name = "audience", required = false, defaultValue = "all") String audience) {
        return userService.list(search, page, size, sort, direction, audience);
    }

    @GetMapping("/summary")
    public UserSummaryResponse summary() {
        return userService.summary();
    }

    @PostMapping
    public UserDto create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @GetMapping("/{id}")
    public UserDto get(@PathVariable("id") Long id) {
        return userService.get(id);
    }

    @PutMapping("/{id}")
    public UserDto update(@PathVariable("id") Long id, @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public UserDto updateStatus(@PathVariable("id") Long id,
                                @Valid @RequestBody UpdateUserStatusRequest request) {
        return userService.updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id) {
        userService.delete(id);
    }

    @PostMapping("/{id}/roles")
    public UserDto assignRoles(@PathVariable("id") Long id, @Valid @RequestBody AssignRolesRequest request) {
        return userService.assignRoles(id, request);
    }

    @DeleteMapping("/{userId}/roles/{roleId}")
    public UserDto removeRole(@PathVariable("userId") Long userId, @PathVariable("roleId") Long roleId) {
        return userService.removeRole(userId, roleId);
    }

    @PutMapping("/{id}/permissions")
    public UserDto updatePermissions(@PathVariable("id") Long id,
                                     @Valid @RequestBody UpdateUserPermissionsRequest request) {
        return userService.updateDirectPermissions(id, request);
    }

    @PostMapping("/{id}/verify")
    public UserDto verify(@PathVariable("id") Long id) {
        return userService.verifyUser(id);
    }

    @PostMapping("/{id}/unlock")
    public UserDto unlock(@PathVariable("id") Long id) {
        return userService.unlockUser(id);
    }

}
