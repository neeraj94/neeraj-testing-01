package com.example.rbac.admin.gallery.service;

import com.example.rbac.admin.settings.model.Setting;
import com.example.rbac.admin.settings.repository.SettingRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GallerySettingsService {

    private static final String ALLOWED_EXTENSIONS_CODE = "gallery.allowed_extensions";
    private static final String MAX_FILE_SIZE_CODE = "gallery.max_file_size_mb";
    private static final long DEFAULT_MAX_FILE_SIZE_BYTES = 50L * 1024L * 1024L;
    private static final long MAX_CONFIGURABLE_FILE_SIZE_BYTES = 5L * 1024L * 1024L * 1024L;

    private final SettingRepository settingRepository;

    public GallerySettingsService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public List<String> resolveAllowedExtensions() {
        Optional<Setting> setting = settingRepository.findByCode(ALLOWED_EXTENSIONS_CODE);
        String configured = setting.map(Setting::getValue).orElse(null);
        if (configured == null || configured.isBlank()) {
            return List.of("png", "jpg", "jpeg", "gif", "pdf", "docx", "xlsx", "mp4", "zip");
        }
        LinkedHashSet<String> normalized = Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(this::normalizeExtension)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        normalized.add("zip");
        return normalized.stream().collect(Collectors.toList());
    }

    public long resolveMaxFileSizeBytes() {
        Optional<Setting> setting = settingRepository.findByCode(MAX_FILE_SIZE_CODE);
        String configured = setting.map(Setting::getValue).orElse(null);
        if (configured == null || configured.isBlank()) {
            return DEFAULT_MAX_FILE_SIZE_BYTES;
        }
        try {
            double megabytes = Double.parseDouble(configured.trim());
            if (Double.isNaN(megabytes) || megabytes <= 0) {
                return DEFAULT_MAX_FILE_SIZE_BYTES;
            }
            long bytes = (long) Math.floor(megabytes * 1024D * 1024D);
            return clampFileSize(bytes);
        } catch (NumberFormatException ex) {
            return DEFAULT_MAX_FILE_SIZE_BYTES;
        }
    }

    private long clampFileSize(long bytes) {
        if (bytes <= 0) {
            return DEFAULT_MAX_FILE_SIZE_BYTES;
        }
        return Math.min(bytes, MAX_CONFIGURABLE_FILE_SIZE_BYTES);
    }

    private String normalizeExtension(String value) {
        String sanitized = value.startsWith(".") ? value.substring(1) : value;
        return sanitized.toLowerCase(Locale.ROOT);
    }
}
