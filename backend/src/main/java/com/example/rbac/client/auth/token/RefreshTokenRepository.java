<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/auth/token/RefreshTokenRepository.java
package com.example.rbac.client.auth.token;
========
package com.example.rbac.admin.auth.token;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/auth/token/RefreshTokenRepository.java

import com.example.rbac.admin.users.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    void deleteByUser(User user);

    void deleteByExpiresAtBefore(Instant time);
}
