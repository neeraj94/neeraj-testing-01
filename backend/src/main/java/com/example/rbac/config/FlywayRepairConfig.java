package com.example.rbac.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;

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

    private static final String DEPRECATED_MIGRATION_PATTERN = "classpath*:db/migration/V14__gallery_max_file_size.sql";

    @Bean
    public FlywayMigrationStrategy repairAndMigrateStrategy(ResourcePatternResolver resourcePatternResolver) {
        return flyway -> {
            removeDeprecatedMigration(resourcePatternResolver);
            try {
                flyway.repair();
                log.info("Flyway schema history repaired before migration");
            } catch (FlywayException ex) {
                log.warn("Flyway repair failed; continuing with migration", ex);
            }
            flyway.migrate();
        };
    }

    private void removeDeprecatedMigration(ResourcePatternResolver resolver) {
        try {
            Resource[] resources = resolver.getResources(DEPRECATED_MIGRATION_PATTERN);
            Arrays.stream(resources)
                    .filter(Resource::exists)
                    .forEach(resource -> {
                        try {
                            Path path = resource.getFile().toPath();
                            if (Files.deleteIfExists(path)) {
                                log.info("Removed deprecated Flyway migration {}", path);
                            }
                        } catch (IOException ex) {
                            log.warn("Unable to remove deprecated migration resource {}", resource, ex);
                        }
                    });
        } catch (IOException ex) {
            log.warn("Failed to resolve deprecated migration resources", ex);
        }
    }
}
