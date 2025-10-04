package com.example.rbac.users.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.roles.model.Role;
import com.example.rbac.roles.repository.RoleRepository;
import com.example.rbac.users.dto.AssignRolesRequest;
import com.example.rbac.users.dto.CreateUserRequest;
import com.example.rbac.users.dto.ProfileUpdateRequest;
import com.example.rbac.users.dto.UpdateUserRequest;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.mapper.UserMapper;
import com.example.rbac.users.model.User;
import com.example.rbac.users.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       UserMapper userMapper) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
    }

    @PreAuthorize("hasAuthority('USER_VIEW')")
    public PageResponse<UserDto> list(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> result;
        if (search != null && !search.isBlank()) {
            result = userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(search, search, pageable);
        } else {
            result = userRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(userMapper::toDto));
    }

    @PreAuthorize("hasAuthority('USER_CREATE')")
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
        user = userRepository.save(user);
        return userMapper.toDto(user);
    }

    @PreAuthorize("hasAuthority('USER_VIEW')")
    public UserDto get(Long id) {
        User user = userRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return userMapper.toDto(user);
    }

    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Transactional
    public UserDto update(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setActive(request.isActive());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getRoleIds() != null) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            user.setRoles(roles);
        }
        user = userRepository.save(user);
        return userMapper.toDto(userRepository.findDetailedById(user.getId()).orElseThrow());
    }

    @PreAuthorize("hasAuthority('USER_DELETE')")
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);
    }

    @PreAuthorize("hasAuthority('USER_UPDATE')")
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
        return userMapper.toDto(user);
    }

    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Transactional
    public UserDto removeRole(Long userId, Long roleId) {
        User user = userRepository.findDetailedById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.getRoles().removeIf(role -> role.getId().equals(roleId));
        user = userRepository.save(user);
        return userMapper.toDto(user);
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
}
