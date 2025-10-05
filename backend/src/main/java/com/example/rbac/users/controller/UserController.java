package com.example.rbac.users.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.users.dto.AssignRolesRequest;
import com.example.rbac.users.dto.CreateUserRequest;
import com.example.rbac.users.dto.UpdateUserRequest;
import com.example.rbac.users.dto.UpdateUserPermissionsRequest;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public PageResponse<UserDto> list(@RequestParam(name = "search", required = false) String search,
                                      @RequestParam(name = "page", defaultValue = "0") int page,
                                      @RequestParam(name = "size", defaultValue = "20") int size) {
        return userService.list(search, page, size);
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
}
