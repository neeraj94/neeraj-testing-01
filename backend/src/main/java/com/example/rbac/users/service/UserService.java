package com.example.rbac.users.service;

import com.example.rbac.activity.service.ActivityRecorder;
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
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final String CUSTOMER_ROLE_KEY = "CUSTOMER";

    private static final String USER_VIEW_AUTHORITY = "hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN')";
    private static final String USER_CREATE_AUTHORITY = "hasAuthority('USER_CREATE')";
    private static final String USER_UPDATE_AUTHORITY = "hasAuthority('USER_UPDATE')";
    private static final String USER_DELETE_AUTHORITY = "hasAuthority('USER_DELETE')";

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
    private final ActivityRecorder activityRecorder;
    private final UserVerificationService userVerificationService;

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       PermissionRepository permissionRepository,
                       UserMapper userMapper,
                       ActivityRecorder activityRecorder,
                       UserVerificationService userVerificationService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissionRepository = permissionRepository;
        this.userMapper = userMapper;
        this.activityRecorder = activityRecorder;
        this.userVerificationService = userVerificationService;
    }

    @PreAuthorize(USER_VIEW_AUTHORITY)
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

    @PreAuthorize(USER_CREATE_AUTHORITY)
    @Transactional
    public UserDto create(CreateUserRequest request) {
        String email = trimToEmpty(request.getEmail());
        userRepository.findByEmail(email).ifPresent(existing -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        });
        User user = new User();
        String firstName = trimToEmpty(request.getFirstName());
        String lastName = trimToEmpty(request.getLastName());
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setFullName(combineFullName(firstName, lastName));
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive(request.isActive());
        user.setPhoneNumber(normalize(request.getPhoneNumber()));
        user.setWhatsappNumber(normalize(request.getWhatsappNumber()));
        user.setFacebookUrl(normalize(request.getFacebookUrl()));
        user.setLinkedinUrl(normalize(request.getLinkedinUrl()));
        user.setSkypeId(normalize(request.getSkypeId()));
        user.setEmailSignature(normalizeMultiline(request.getEmailSignature()));
        user.setLoginAttempts(0);
        user.setLockedAt(null);
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            if (roles.size() != request.getRoleIds().size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "One or more roles not found");
            }
            user.setRoles(replaceAssignments(user.getRoles(), roles));
        }
        Set<Permission> direct = fetchPermissions(request.getPermissionKeys());
        user.setDirectPermissions(replaceAssignments(user.getDirectPermissions(), direct));
        Set<Permission> revoked = fetchPermissions(request.getRevokedPermissionKeys());
        removeOverlap(direct, revoked);
        user.setRevokedPermissions(replaceAssignments(user.getRevokedPermissions(), revoked));
        user.setEmailVerifiedAt(null);
        user = userRepository.saveAndFlush(user);
        User detailed = userRepository.findDetailedById(user.getId()).orElseThrow();
        userVerificationService.initiateVerification(detailed);
        UserDto dto = userMapper.toDto(detailed);
        activityRecorder.record("Users", "CREATE", "Created user " + detailed.getEmail(), "SUCCESS", buildUserContext(detailed));
        return dto;
    }

    @PreAuthorize(USER_VIEW_AUTHORITY)
    public UserDto get(Long id) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return userMapper.toDto(user);
    }

    @PreAuthorize(USER_UPDATE_AUTHORITY)
    @Transactional
    public UserDto update(Long id, UpdateUserRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        String email = trimToEmpty(request.getEmail());
        if (!user.getEmail().equalsIgnoreCase(email)
                && userRepository.existsByEmailAndIdNot(email, id)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        }
        String firstName = trimToEmpty(request.getFirstName());
        String lastName = trimToEmpty(request.getLastName());
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setFullName(combineFullName(firstName, lastName));
        user.setActive(request.isActive());
        user.setPhoneNumber(normalize(request.getPhoneNumber()));
        user.setWhatsappNumber(normalize(request.getWhatsappNumber()));
        user.setFacebookUrl(normalize(request.getFacebookUrl()));
        user.setLinkedinUrl(normalize(request.getLinkedinUrl()));
        user.setSkypeId(normalize(request.getSkypeId()));
        user.setEmailSignature(normalizeMultiline(request.getEmailSignature()));
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getRoleIds() != null) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            if (roles.size() != request.getRoleIds().size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "One or more roles not found");
            }
            user.setRoles(replaceAssignments(user.getRoles(), roles));
        }
        if (request.getPermissionKeys() != null) {
            Set<Permission> direct = fetchPermissions(request.getPermissionKeys());
            user.setDirectPermissions(replaceAssignments(user.getDirectPermissions(), direct));
            Set<Permission> revoked = fetchPermissions(request.getRevokedPermissionKeys());
            removeOverlap(direct, revoked);
            user.setRevokedPermissions(replaceAssignments(user.getRevokedPermissions(), revoked));
        }
        if (request.getRevokedPermissionKeys() != null && request.getPermissionKeys() == null) {
            Set<Permission> revoked = fetchPermissions(request.getRevokedPermissionKeys());
            removeOverlap(user.getDirectPermissions(), revoked);
            user.setRevokedPermissions(replaceAssignments(user.getRevokedPermissions(), revoked));
        }
        user = userRepository.saveAndFlush(user);
        UserDto dto = userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
        activityRecorder.record("Users", "UPDATE", "Updated user " + user.getEmail(), "SUCCESS", buildUserContext(user));
        return dto;
    }

    @PreAuthorize(USER_UPDATE_AUTHORITY)
    @Transactional
    public UserDto updateStatus(Long id, UpdateUserStatusRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(Boolean.TRUE.equals(request.getActive()));
        user = userRepository.saveAndFlush(user);
        UserDto dto = userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
        activityRecorder.record("Users", "STATUS_CHANGE", "Updated status for user " + user.getEmail(), "SUCCESS", buildUserContext(user));
        return dto;
    }

    @PreAuthorize(USER_DELETE_AUTHORITY)
    public void delete(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        userRepository.delete(user);
        activityRecorder.record("Users", "DELETE", "Deleted user " + user.getEmail(), "SUCCESS", buildUserContext(user));
    }

    @PreAuthorize(USER_UPDATE_AUTHORITY)
    @Transactional
    public UserDto assignRoles(Long id, AssignRolesRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
        if (roles.size() != request.getRoleIds().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more roles not found");
        }
        user.setRoles(replaceAssignments(user.getRoles(), roles));
        user = userRepository.saveAndFlush(user);
        UserDto dto = userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
        HashMap<String, Object> context = new HashMap<>(buildUserContext(user));
        context.put("roleIds", request.getRoleIds());
        activityRecorder.record("Users", "ASSIGN_ROLES", "Assigned roles to user " + user.getEmail(), "SUCCESS", context);
        return dto;
    }

    @PreAuthorize(USER_UPDATE_AUTHORITY)
    @Transactional
    public UserDto removeRole(Long userId, Long roleId) {
        User user = userRepository.findDetailedById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.getRoles().removeIf(role -> role.getId().equals(roleId));
        user = userRepository.saveAndFlush(user);
        UserDto dto = userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
        HashMap<String, Object> context = new HashMap<>(buildUserContext(user));
        context.put("roleId", roleId);
        activityRecorder.record("Users", "REMOVE_ROLE", "Removed role from user " + user.getEmail(), "SUCCESS", context);
        return dto;
    }

    @Transactional
    public UserDto updateProfile(User currentUser, ProfileUpdateRequest request) {
        User user = userRepository.findDetailedById(currentUser.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        String email = trimToEmpty(request.getEmail());
        if (!user.getEmail().equalsIgnoreCase(email)
                && userRepository.existsByEmailAndIdNot(email, user.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        }
        String firstName = trimToEmpty(request.getFirstName());
        String lastName = trimToEmpty(request.getLastName());
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setFullName(combineFullName(firstName, lastName));
        user.setEmail(email);
        user.setPhoneNumber(normalize(request.getPhoneNumber()));
        user.setWhatsappNumber(normalize(request.getWhatsappNumber()));
        user.setFacebookUrl(normalize(request.getFacebookUrl()));
        user.setLinkedinUrl(normalize(request.getLinkedinUrl()));
        user.setSkypeId(normalize(request.getSkypeId()));
        user.setEmailSignature(normalizeMultiline(request.getEmailSignature()));
        if (StringUtils.hasText(request.getNewPassword())) {
            if (!StringUtils.hasText(request.getOldPassword())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is required to set a new password");
            }
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
            }
            if (!StringUtils.hasText(request.getConfirmNewPassword())
                    || !request.getNewPassword().equals(request.getConfirmNewPassword())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "New password confirmation does not match");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        } else if (StringUtils.hasText(request.getOldPassword()) || StringUtils.hasText(request.getConfirmNewPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New password is required when updating your password");
        }
        user = userRepository.saveAndFlush(user);
        UserDto dto = userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
        HashMap<String, Object> context = new HashMap<>(buildUserContext(user));
        context.put("profileUpdated", true);
        activityRecorder.record("Users", "PROFILE_UPDATE", "Updated profile for user " + user.getEmail(), "SUCCESS", context);
        return dto;
    }

    @PreAuthorize(USER_UPDATE_AUTHORITY)
    @Transactional
    public UserDto updateDirectPermissions(Long id, UpdateUserPermissionsRequest request) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Set<Permission> direct = fetchPermissions(request.getGrantedPermissionKeys());
        Set<Permission> revoked = fetchPermissions(request.getRevokedPermissionKeys());
        removeOverlap(direct, revoked);
        user.setDirectPermissions(replaceAssignments(user.getDirectPermissions(), direct));
        user.setRevokedPermissions(replaceAssignments(user.getRevokedPermissions(), revoked));
        user = userRepository.saveAndFlush(user);
        UserDto dto = userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
        HashMap<String, Object> context = new HashMap<>(buildUserContext(user));
        context.put("grantedPermissions", request.getGrantedPermissionKeys());
        context.put("revokedPermissions", request.getRevokedPermissionKeys());
        activityRecorder.record("Users", "PERMISSIONS_UPDATE", "Updated direct permissions for user " + user.getEmail(), "SUCCESS", context);
        return dto;
    }

    @PreAuthorize(USER_UPDATE_AUTHORITY)
    @Transactional
    public UserDto verifyUser(Long id) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        boolean wasVerified = user.getEmailVerifiedAt() != null;
        boolean welcomeSent = userVerificationService.markVerifiedByAdmin(user);
        UserDto dto = userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
        HashMap<String, Object> context = new HashMap<>(buildUserContext(user));
        context.put("verified", true);
        context.put("wasVerified", wasVerified);
        context.put("welcomeEmailSent", welcomeSent);
        context.put("loginAttempts", user.getLoginAttempts());
        context.put("lockedAt", user.getLockedAt());
        activityRecorder.record("Users", "VERIFY", "Verified user " + user.getEmail(), "SUCCESS", context);
        return dto;
    }

    @PreAuthorize(USER_UPDATE_AUTHORITY)
    @Transactional
    public UserDto unlockUser(Long id) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setLockedAt(null);
        user.setLoginAttempts(0);
        user = userRepository.saveAndFlush(user);
        UserDto dto = userMapper.toDto(user);
        HashMap<String, Object> context = new HashMap<>(buildUserContext(user));
        context.put("locked", false);
        context.put("loginAttempts", user.getLoginAttempts());
        activityRecorder.record("Users", "UNLOCK", "Unlocked user " + user.getEmail(), "SUCCESS", context);
        return dto;
    }

    @PreAuthorize(USER_VIEW_AUTHORITY)
    public UserSummaryResponse summary() {
        long total = userRepository.count();
        long active = userRepository.countByActiveTrue();
        long inactive = userRepository.countByActiveFalse();
        long customers = userRepository.countByRoleKeyIgnoreCase(CUSTOMER_ROLE_KEY);
        long internal = Math.max(total - customers, 0);
        return new UserSummaryResponse(total, active, inactive, customers, internal);
    }

    private <T> Set<T> replaceAssignments(Set<T> current, Set<T> replacement) {
        Set<T> target = current != null ? current : new HashSet<>();
        target.clear();
        target.addAll(replacement);
        return target;
    }

    private Set<Permission> fetchPermissions(Set<String> permissionKeys) {
        if (permissionKeys == null || permissionKeys.isEmpty()) {
            return new HashSet<>();
        }
        Set<String> normalized = permissionKeys.stream()
                .filter(key -> key != null && !key.isBlank())
                .map(key -> key.toUpperCase())
                .collect(Collectors.toCollection(HashSet::new));
        if (normalized.isEmpty()) {
            return new HashSet<>();
        }
        List<Permission> permissions = permissionRepository.findByKeyIn(normalized);
        if (permissions.size() != normalized.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more permissions were not found");
        }
        return new HashSet<>(permissions);
    }

    private void removeOverlap(Set<Permission> direct, Set<Permission> revoked) {
        if (direct.isEmpty() || revoked.isEmpty()) {
            return;
        }
        Set<String> directKeys = direct.stream()
                .map(Permission::getKey)
                .collect(Collectors.toSet());
        revoked.removeIf(permission -> directKeys.contains(permission.getKey()));
    }

    private HashMap<String, Object> buildUserContext(User user) {
        HashMap<String, Object> context = new HashMap<>();
        if (user == null) {
            return context;
        }
        if (user.getId() != null) {
            context.put("userId", user.getId());
        }
        if (user.getEmail() != null) {
            context.put("email", user.getEmail());
        }
        context.put("active", user.isActive());
        context.put("locked", user.getLockedAt() != null);
        context.put("loginAttempts", user.getLoginAttempts());
        context.put("verified", user.getEmailVerifiedAt() != null);
        return context;
    }

    private String combineFullName(String firstName, String lastName) {
        StringBuilder builder = new StringBuilder();
        if (StringUtils.hasText(firstName)) {
            builder.append(firstName.trim());
        }
        if (StringUtils.hasText(lastName)) {
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(lastName.trim());
        }
        return builder.length() > 0 ? builder.toString() : null;
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String normalizeMultiline(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
