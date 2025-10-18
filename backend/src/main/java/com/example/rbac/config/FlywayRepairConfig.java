package com.example.rbac.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.springframework.dao.DataAccessException;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Ensures Flyway repairs mismatched checksums before attempting to migrate.
 *
 * <p>Some environments may have executed an earlier version of the V2 seed migration
 * that used a different checksum. When we updated the seed data, Flyway began failing
 * validation during application startup. By running {@link Flyway#repair()} ahead of
 * {@link Flyway#migrate()}, we automatically align the stored checksums with the
 * current scripts without manual intervention.</p>
 */
@Configuration
public class FlywayRepairConfig {

    private static final String[] DEPRECATED_MIGRATION_PATTERNS = {
        "classpath*:db/migration/V14__gallery_max_file_size.sql",
        "classpath*:db/migration/V48__checkout_permissions.sql",
        "classpath*:db/migration/V51__cart_permissions_and_remove_wedges.sql"
    };
    private static final Logger LOGGER = LoggerFactory.getLogger(FlywayRepairConfig.class);
    private static final String[][] DEPRECATED_SCHEMA_HISTORY_ENTRIES = {
        {"48", "checkout_permissions"}
    };

    @Bean
    public FlywayMigrationStrategy repairAndMigrateStrategy(
            ResourcePatternResolver resourcePatternResolver,
            DataSource dataSource) {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        return flyway -> {
            removeDeprecatedMigrations(resourcePatternResolver, DEPRECATED_MIGRATION_PATTERNS);
            pruneDeprecatedSchemaHistoryEntries(jdbcTemplate);
            try {
                flyway.repair();
                LOGGER.info("Flyway schema history repaired before migration");
            } catch (FlywayException ex) {
                LOGGER.warn("Flyway repair failed; continuing with migration", ex);
            }
            flyway.migrate();
        };
    }

    private void removeDeprecatedMigrations(ResourcePatternResolver resolver, String... patterns) {
        Arrays.stream(patterns)
                .forEach(pattern -> {
                    try {
                        Resource[] resources = resolver.getResources(pattern);
                        Arrays.stream(resources)
                                .filter(Resource::exists)
                                .forEach(resource -> {
                                    try {
                                        Path path = resource.getFile().toPath();
                                        if (Files.deleteIfExists(path)) {
                                            LOGGER.info("Removed deprecated Flyway migration {}", path);
                                        }
                                    } catch (IOException ex) {
                                        LOGGER.warn(
                                                "Unable to remove deprecated migration resource {}", resource, ex);
                                    }
                                });
                    } catch (IOException ex) {
                        LOGGER.warn("Failed to resolve deprecated migration resources for pattern {}", pattern, ex);
                    }
                });
    }

    private void pruneDeprecatedSchemaHistoryEntries(JdbcTemplate jdbcTemplate) {
        Arrays.stream(DEPRECATED_SCHEMA_HISTORY_ENTRIES)
                .forEach(entry -> {
                    String version = entry[0];
                    String description = entry[1];
                    try {
                        int removed = jdbcTemplate.update(
                                "DELETE FROM flyway_schema_history WHERE version = ? AND description = ? AND success = 1",
                                version,
                                description);
                        if (removed > 0) {
                            LOGGER.info(
                                    "Removed deprecated Flyway schema history entry {} - {}",
                                    version,
                                    description);
                        }
                    } catch (DataAccessException ex) {
                        LOGGER.warn(
                                "Unable to prune deprecated Flyway schema history entry {} - {}",
                                version,
                                description,
                                ex);
                    }
                });
    }
}
