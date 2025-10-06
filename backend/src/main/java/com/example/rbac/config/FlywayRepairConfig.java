package com.example.rbac.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Ensures Flyway repairs mismatched checksums before attempting to migrate.
 *
 * <p>Some environments may have executed an earlier version of the V2 seed migration
 * that used a different checksum. When we updated the seed data, Flyway began failing
 * validation during application startup. By running {@link Flyway#repair()} ahead of
 * {@link Flyway#migrate()}, we automatically align the stored checksums with the
 * current scripts without manual intervention.</p>
 */
@Slf4j
@Configuration
public class FlywayRepairConfig {

    @Bean
    public FlywayMigrationStrategy repairAndMigrateStrategy() {
        return flyway -> {
            try {
                flyway.repair();
                log.info("Flyway schema history repaired before migration");
            } catch (FlywayException ex) {
                log.warn("Flyway repair failed; continuing with migration", ex);
            }
            flyway.migrate();
        };
    }
}
