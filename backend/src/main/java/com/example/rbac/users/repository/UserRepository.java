package com.example.rbac.users.repository;

import com.example.rbac.users.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findDetailedById(Long id);

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Page<User> findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(String email, String name, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Page<User> findAll(Pageable pageable);
}
