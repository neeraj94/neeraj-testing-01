package com.example.rbac.admin.users.repository;

import com.example.rbac.admin.users.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    @Query("""
            SELECT DISTINCT u FROM User u
            JOIN u.roles r
            WHERE UPPER(r.key) = UPPER(:roleKey)
            """)
    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Page<User> findCustomersByRoleKey(@Param("roleKey") String roleKey, Pageable pageable);

    @Query("""
            SELECT DISTINCT u FROM User u
            JOIN u.roles r
            WHERE UPPER(r.key) = UPPER(:roleKey)
              AND (LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :term, '%')))
            """)
    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Page<User> searchCustomersByRoleKey(@Param("roleKey") String roleKey, @Param("term") String term, Pageable pageable);

    @Query("""
            SELECT DISTINCT u FROM User u
            WHERE NOT EXISTS (
                SELECT r FROM u.roles r WHERE UPPER(r.key) = UPPER(:excludedRole)
            )
            """)
    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Page<User> findStaffWithoutRole(@Param("excludedRole") String excludedRole, Pageable pageable);

    @Query("""
            SELECT DISTINCT u FROM User u
            WHERE NOT EXISTS (
                SELECT r FROM u.roles r WHERE UPPER(r.key) = UPPER(:excludedRole)
            )
              AND (LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :term, '%')))
            """)
    @EntityGraph(attributePaths = {"roles", "roles.permissions", "directPermissions", "revokedPermissions"})
    Page<User> searchStaffWithoutRole(@Param("excludedRole") String excludedRole,
                                      @Param("term") String term,
                                      Pageable pageable);

    long countByActiveTrue();

    long countByActiveFalse();

    @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE UPPER(r.key) = UPPER(:roleKey)")
    long countByRoleKeyIgnoreCase(@Param("roleKey") String roleKey);

    boolean existsByEmailAndIdNot(String email, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
}
