package com.example.rbac.settings.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.settings.dto.*;
import com.example.rbac.settings.model.Setting;
import com.example.rbac.settings.model.SettingValueType;
import com.example.rbac.settings.repository.SettingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SettingsService {

    private static final Logger log = LoggerFactory.getLogger(SettingsService.class);
    private static final String PRIMARY_COLOR_CODE = "appearance.primary_color";
    private static final String DEFAULT_PRIMARY_COLOR = "#2563EB";

    private final SettingRepository settingRepository;
    private final ObjectMapper objectMapper;

    public SettingsService(SettingRepository settingRepository, ObjectMapper objectMapper) {
        this.settingRepository = settingRepository;
        this.objectMapper = objectMapper;
    }

    public SettingsResponse getSettings() {
        List<Setting> settings = settingRepository.findAllByOrderByCategoryOrderAscSectionOrderAscFieldOrderAsc();
        return mapSettings(settings);
    }

    @Transactional
    public SettingsResponse updateSettings(SettingsUpdateRequest request) {
        List<SettingValueUpdateRequest> updates = request.getUpdates();
        if (updates == null || updates.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No settings provided for update");
        }

        // Preserve order but deduplicate codes
        LinkedHashMap<String, SettingValueUpdateRequest> uniqueUpdates = new LinkedHashMap<>();
        for (SettingValueUpdateRequest update : updates) {
            uniqueUpdates.put(update.getCode(), update);
        }

        List<String> codes = new ArrayList<>(uniqueUpdates.keySet());
        List<Setting> existing = settingRepository.findByCodeIn(codes);
        Map<String, Setting> existingByCode = existing.stream()
                .collect(Collectors.toMap(Setting::getCode, setting -> setting));

        List<Setting> toPersist = new ArrayList<>();
        for (String code : codes) {
            Setting setting = existingByCode.get(code);
            if (setting == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Setting not found: " + code);
            }
            if (!setting.isEditable()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Setting is read-only: " + code);
            }
            String normalized = normalizeValue(setting, uniqueUpdates.get(code).getValue());
            if (!Objects.equals(setting.getValue(), normalized)) {
                setting.setValue(normalized);
                toPersist.add(setting);
            }
        }

        if (!toPersist.isEmpty()) {
            settingRepository.saveAll(toPersist);
        }

        return getSettings();
    }

    public SettingsThemeDto getTheme() {
        return new SettingsThemeDto(resolvePrimaryColor());
    }

    public String resolvePrimaryColor() {
        Optional<Setting> setting = settingRepository.findByCode(PRIMARY_COLOR_CODE);
        return normalizeColor(setting.map(Setting::getValue).orElse(DEFAULT_PRIMARY_COLOR));
    }

    private SettingsResponse mapSettings(List<Setting> settings) {
        LinkedHashMap<String, SettingsCategoryDto> categories = new LinkedHashMap<>();
        Map<String, LinkedHashMap<String, SettingsSectionDto>> sectionsByCategory = new LinkedHashMap<>();

        for (Setting setting : settings) {
            SettingsCategoryDto category = categories.computeIfAbsent(setting.getCategoryKey(), key -> {
                SettingsCategoryDto dto = new SettingsCategoryDto();
                dto.setKey(key);
                dto.setLabel(setting.getCategoryLabel());
                dto.setDescription(setting.getCategoryDescription());
                dto.setSections(new ArrayList<>());
                sectionsByCategory.put(key, new LinkedHashMap<>());
                return dto;
            });

            LinkedHashMap<String, SettingsSectionDto> sections = sectionsByCategory.get(setting.getCategoryKey());
            SettingsSectionDto section = sections.computeIfAbsent(setting.getSectionKey(), key -> {
                SettingsSectionDto dto = new SettingsSectionDto();
                dto.setKey(key);
                dto.setLabel(setting.getSectionLabel());
                dto.setDescription(setting.getSectionDescription());
                dto.setSettings(new ArrayList<>());
                category.getSections().add(dto);
                return dto;
            });

            section.getSettings().add(toDto(setting));
        }

        return new SettingsResponse(new ArrayList<>(categories.values()));
    }

    private SettingDto toDto(Setting setting) {
        SettingDto dto = new SettingDto();
        dto.setId(setting.getId());
        dto.setCode(setting.getCode());
        dto.setLabel(setting.getLabel());
        dto.setDescription(setting.getDescription());
        dto.setValue(setting.getValue());
        dto.setValueType(setting.getValueType());
        dto.setEditable(setting.isEditable());
        dto.setOptions(parseOptions(setting.getOptionsJson()));
        return dto;
    }

    private List<SettingOptionDto> parseOptions(String optionsJson) {
        if (optionsJson == null || optionsJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(optionsJson, new TypeReference<List<SettingOptionDto>>() {
            });
        } catch (IOException ex) {
            log.warn("Failed to parse options for settings JSON: {}", optionsJson, ex);
            return List.of();
        }
    }

    private String normalizeValue(Setting setting, String raw) {
        SettingValueType type = setting.getValueType();
        if (type.isBoolean()) {
            return normalizeBoolean(raw);
        }
        if (type.isNumeric()) {
            return normalizeNumber(setting, raw);
        }
        if (type.isColor()) {
            return normalizeColor(raw);
        }
        if (type == SettingValueType.TEXT) {
            return raw == null ? "" : raw;
        }
        // STRING fallback
        return raw == null ? "" : raw.trim();
    }

    private String normalizeBoolean(String raw) {
        if (raw == null) {
            return "false";
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("true", "false").contains(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid boolean value: " + raw);
        }
        return normalized;
    }

    private String normalizeNumber(Setting setting, String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Value required for setting: " + setting.getLabel());
        }
        try {
            BigDecimal value = new BigDecimal(raw.trim());
            return value.stripTrailingZeros().toPlainString();
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid numeric value for setting: " + setting.getLabel());
        }
    }

    private String normalizeColor(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return DEFAULT_PRIMARY_COLOR;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (!normalized.startsWith("#")) {
            normalized = "#" + normalized;
        }
        if (!normalized.matches("#[0-9A-F]{6}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Color must be a hex value like #3366FF");
        }
        return normalized;
    }
}
