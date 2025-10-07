package com.example.rbac.gallery.service;

import com.example.rbac.settings.model.Setting;
import com.example.rbac.settings.repository.SettingRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GallerySettingsService {

    private static final String ALLOWED_EXTENSIONS_CODE = "gallery.allowed_extensions";

    private final SettingRepository settingRepository;

    public GallerySettingsService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public List<String> resolveAllowedExtensions() {
        Optional<Setting> setting = settingRepository.findByCode(ALLOWED_EXTENSIONS_CODE);
        String configured = setting.map(Setting::getValue).orElse(null);
        if (configured == null || configured.isBlank()) {
            return List.of("png", "jpg", "jpeg", "pdf", "docx", "xlsx", "mp4");
        }
        return Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> normalizeExtension(value))
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalizeExtension(String value) {
        String sanitized = value.startsWith(".") ? value.substring(1) : value;
        return sanitized.toLowerCase(Locale.ROOT);
    }
}
