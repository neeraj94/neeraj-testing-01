package com.example.rbac.admin.users.repository;

import com.example.rbac.admin.users.model.UserVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserVerificationTokenRepository extends JpaRepository<UserVerificationToken, Long> {

    Optional<UserVerificationToken> findByToken(String token);

    void deleteByUserIdAndVerifiedAtIsNull(Long userId);
}
