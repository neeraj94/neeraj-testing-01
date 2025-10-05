package com.example.rbac.users.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.roles.model.Role;
import com.example.rbac.roles.repository.RoleRepository;
import com.example.rbac.permissions.model.Permission;
import com.example.rbac.permissions.repository.PermissionRepository;
import com.example.rbac.users.dto.AssignRolesRequest;
import com.example.rbac.users.dto.CreateUserRequest;
import com.example.rbac.users.dto.ProfileUpdateRequest;
import com.example.rbac.users.dto.UpdateUserRequest;
import com.example.rbac.users.dto.UpdateUserPermissionsRequest;
import com.example.rbac.users.dto.UpdateUserStatusRequest;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.dto.UserSummaryResponse;
import com.example.rbac.users.mapper.UserMapper;
import com.example.rbac.users.model.User;
import com.example.rbac.users.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final String CUSTOMER_ROLE_KEY = "CUSTOMER";

    private static final String USER_OR_CUSTOMER_VIEW = "hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN','CUSTOMER_VIEW','CUSTOMER_VIEW_GLOBAL','CUSTOMER_VIEW_OWN','CUSTOMER_CREATE','CUSTOMER_UPDATE','CUSTOMER_DELETE')";
    private static final String USER_OR_CUSTOMER_CREATE = "hasAnyAuthority('USER_CREATE','CUSTOMER_CREATE')";
    private static final String USER_OR_CUSTOMER_UPDATE = "hasAnyAuthority('USER_UPDATE','CUSTOMER_UPDATE')";
    private static final String USER_OR_CUSTOMER_DELETE = "hasAnyAuthority('USER_DELETE','CUSTOMER_DELETE')";

    private static final Map<String, String> USER_SORT_MAPPING = Map.of(
            "name", "fullName",
            "email", "email",
            "status", "active",
            "createdAt", "createdAt"
    );

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionRepository permissionRepository;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       PermissionRepository permissionRepository,
                       UserMapper userMapper) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionRepository = permissionRepository;
        this.userMapper = userMapper;
    }

    @PreAuthorize(USER_OR_CUSTOMER_VIEW)
    public PageResponse<UserDto> list(String search, int page, int size, String sort, String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        Page<User> result;
        if (search != null && !search.isBlank()) {
            result = userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(search, search, pageable);
        } else {
            result = userRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(userMapper::toDto));
    }

    private Pageable buildPageable(int page, int size, String sort, String direction) {
        String normalizedSort = sort == null ? "name" : sort.toLowerCase();
        String property = USER_SORT_MAPPING.getOrDefault(normalizedSort, USER_SORT_MAPPING.get("name"));
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(sortDirection, property));
    }

    @PreAuthorize(USER_OR_CUSTOMER_CREATE)
    @Transactional
    public UserDto create(CreateUserRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        });
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive(request.isActive());
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            if (roles.size() != request.getRoleIds().size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "One or more roles not found");
            }
            user.setRoles(roles);
        }
        if (request.getPermissionKeys() != null && !request.getPermissionKeys().isEmpty()) {
            Set<Permission> direct = fetchPermissions(request.getPermissionKeys());
            user.setDirectPermissions(direct);
        }
        user = userRepository.save(user);
        return userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
    }

    @PreAuthorize(USER_OR_CUSTOMER_VIEW)
    public UserDto get(Long id) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return userMapper.toDto(user);
    }

    @PreAuthorize(USER_OR_CUSTOMER_UPDATE)
    @Transactional
    public UserDto update(Long id, UpdateUserRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setActive(request.isActive());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getRoleIds() != null) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            if (roles.size() != request.getRoleIds().size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "One or more roles not found");
            }
            user.setRoles(roles);
        }
        if (request.getPermissionKeys() != null) {
            Set<Permission> direct = fetchPermissions(request.getPermissionKeys());
            user.setDirectPermissions(direct);
        }
        user = userRepository.save(user);
        return userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
    }

    @PreAuthorize(USER_OR_CUSTOMER_UPDATE)
    @Transactional
    public UserDto updateStatus(Long id, UpdateUserStatusRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(Boolean.TRUE.equals(request.getActive()));
        user = userRepository.save(user);
        return userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
    }

    @PreAuthorize(USER_OR_CUSTOMER_DELETE)
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);
    }

    @PreAuthorize(USER_OR_CUSTOMER_UPDATE)
    @Transactional
    public UserDto assignRoles(Long id, AssignRolesRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
        if (roles.size() != request.getRoleIds().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more roles not found");
        }
        user.setRoles(roles);
        user = userRepository.save(user);
        return userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
    }

    @PreAuthorize(USER_OR_CUSTOMER_UPDATE)
    @Transactional
    public UserDto removeRole(Long userId, Long roleId) {
        User user = userRepository.findDetailedById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.getRoles().removeIf(role -> role.getId().equals(roleId));
        user = userRepository.save(user);
        return userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
    }

    @Transactional
    public UserDto updateProfile(User currentUser, ProfileUpdateRequest request) {
        User user = userRepository.findDetailedById(currentUser.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setFullName(request.getFullName());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        user = userRepository.save(user);
        return userMapper.toDto(user);
    }

    @PreAuthorize(USER_OR_CUSTOMER_UPDATE)
    @Transactional
    public UserDto updateDirectPermissions(Long id, UpdateUserPermissionsRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Set<Permission> direct = fetchPermissions(request.getPermissionKeys());
        user.setDirectPermissions(direct);
        user = userRepository.save(user);
        return userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
    }

    @PreAuthorize(USER_OR_CUSTOMER_VIEW)
    public UserSummaryResponse summary() {
        long total = userRepository.count();
        long active = userRepository.countByActiveTrue();
        long inactive = userRepository.countByActiveFalse();
        long customers = userRepository.countByRoleKeyIgnoreCase(CUSTOMER_ROLE_KEY);
        long internal = Math.max(total - customers, 0);
        return new UserSummaryResponse(total, active, inactive, customers, internal);
    }

    private Set<Permission> fetchPermissions(Set<String> permissionKeys) {
        if (permissionKeys == null || permissionKeys.isEmpty()) {
            return new HashSet<>();
        }
        List<Permission> permissions = permissionRepository.findByKeyIn(permissionKeys);
        if (permissions.size() != permissionKeys.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more permissions were not found");
        }
        return permissions.stream().collect(Collectors.toCollection(HashSet::new));
    }
}
