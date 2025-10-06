package com.example.rbac.users.repository;

import com.example.rbac.users.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Optional<User> findDetailedById(Long id);

    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Page<User> findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(String email, String name, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Page<User> findAll(Pageable pageable);

    long countByActiveTrue();

    long countByActiveFalse();

    @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE UPPER(r.key) = UPPER(:roleKey)")
    long countByRoleKeyIgnoreCase(@Param("roleKey") String roleKey);

    boolean existsByEmailAndIdNot(String email, Long id);
}
