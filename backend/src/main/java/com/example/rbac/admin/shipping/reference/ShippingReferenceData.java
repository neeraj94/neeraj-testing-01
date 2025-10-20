package com.example.rbac.admin.shipping.reference;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
public class ShippingReferenceData {

    private static final Logger LOGGER = LoggerFactory.getLogger(ShippingReferenceData.class);

    private final ObjectMapper objectMapper;
    private final Resource globalStatesResource;
    private final Resource indiaStatesResource;
    private final CityDirectoryClient cityDirectoryClient;

    private final Map<String, Map<String, StateReference>> referenceStates = new LinkedHashMap<>();
    private final Map<String, String> countryAliases = new LinkedHashMap<>();

    public ShippingReferenceData(ObjectMapper objectMapper,
                                 @Value("classpath:data/shipping/global_states_cities.json") Resource globalStatesResource,
                                 @Value("classpath:data/shipping/india_states.json") Resource indiaStatesResource,
                                 CityDirectoryClient cityDirectoryClient) {
        this.objectMapper = objectMapper;
        this.globalStatesResource = globalStatesResource;
        this.indiaStatesResource = indiaStatesResource;
        this.cityDirectoryClient = cityDirectoryClient;
    }

    @PostConstruct
    public void loadReferenceData() {
        loadGlobalStates();
        loadIndiaStates();
    }

    public List<String> getStateNames(String countryCode, String countryName) {
        String normalizedCode = normalizeCountryCode(countryCode);
        List<String> states = getStateNamesByCode(normalizedCode);
        if (!states.isEmpty()) {
            return states;
        }
        String resolvedCode = resolveCountryCodeByName(countryName);
        if (resolvedCode == null || resolvedCode.equals(normalizedCode)) {
            return Collections.emptyList();
        }
        return getStateNamesByCode(resolvedCode);
    }

    public List<String> getCityNames(String countryCode, String countryName, String stateName) {
        if (!StringUtils.hasText(stateName)) {
            return Collections.emptyList();
        }
        String normalizedCode = normalizeCountryCode(countryCode);
        List<String> cities = getCityNamesByCode(normalizedCode, stateName);
        if (!cities.isEmpty()) {
            return cities;
        }
        String resolvedCode = resolveCountryCodeByName(countryName);
        if (resolvedCode != null && !resolvedCode.equals(normalizedCode)) {
            cities = getCityNamesByCode(resolvedCode, stateName);
            if (!cities.isEmpty()) {
                return cities;
            }
        }
        String apiCountryName = resolveCountryDisplayName(normalizedCode != null ? normalizedCode : resolvedCode, countryName);
        List<String> externalCities = cityDirectoryClient.fetchCities(apiCountryName, stateName);
        if (!CollectionUtils.isEmpty(externalCities)) {
            String codeToRegister = normalizedCode != null ? normalizedCode : resolvedCode;
            if (codeToRegister != null) {
                registerExternalCities(codeToRegister, apiCountryName, stateName, externalCities);
            }
            return externalCities;
        }
        return Collections.emptyList();
    }

    private void loadGlobalStates() {
        if (globalStatesResource == null || !globalStatesResource.exists()) {
            return;
        }
        try (InputStream stream = globalStatesResource.getInputStream()) {
            List<CountrySeed> seeds = objectMapper.readValue(stream, new TypeReference<>() {
            });
            if (CollectionUtils.isEmpty(seeds)) {
                return;
            }
            for (CountrySeed seed : seeds) {
                mergeCountrySeed(seed);
            }
        } catch (IOException ex) {
            LOGGER.warn("Failed to load global shipping reference data: {}", ex.getMessage());
        }
    }

    private void loadIndiaStates() {
        if (indiaStatesResource == null || !indiaStatesResource.exists()) {
            return;
        }
        try (InputStream stream = indiaStatesResource.getInputStream()) {
            List<StateSeed> seeds = objectMapper.readValue(stream, new TypeReference<>() {
            });
            if (CollectionUtils.isEmpty(seeds)) {
                return;
            }
            CountrySeed indiaSeed = new CountrySeed();
            indiaSeed.setCode("IN");
            indiaSeed.setName("India");
            indiaSeed.setAliases(List.of("Republic of India", "Bharat"));
            indiaSeed.setStates(seeds);
            mergeCountrySeed(indiaSeed);
        } catch (IOException ex) {
            LOGGER.warn("Failed to load India shipping reference data: {}", ex.getMessage());
        }
    }

    private void mergeCountrySeed(CountrySeed seed) {
        if (seed == null || !StringUtils.hasText(seed.getCode()) || CollectionUtils.isEmpty(seed.getStates())) {
            return;
        }
        String countryCode = normalizeCountryCode(seed.getCode());
        registerCountryAlias(countryCode, seed.getName());
        if (seed.getAliases() != null) {
            seed.getAliases().forEach(alias -> registerCountryAlias(countryCode, alias));
        }
        registerLocaleAliases(countryCode);
        Map<String, StateReference> states = referenceStates.computeIfAbsent(countryCode, key -> new LinkedHashMap<>());
        for (StateSeed stateSeed : seed.getStates()) {
            if (stateSeed == null || !StringUtils.hasText(stateSeed.getName())) {
                continue;
            }
            String stateName = normalizeDisplayName(stateSeed.getName());
            if (!StringUtils.hasText(stateName)) {
                continue;
            }
            String stateKey = normalizeKey(stateName);
            StateReference reference = states.computeIfAbsent(stateKey, key -> new StateReference(stateName));
            if (!reference.getDisplayName().equals(stateName)) {
                reference.setDisplayName(selectDisplayName(reference.getDisplayName(), stateName));
            }
            if (!CollectionUtils.isEmpty(stateSeed.getCities())) {
                for (String cityName : stateSeed.getCities()) {
                    String normalizedCity = normalizeDisplayName(cityName);
                    if (StringUtils.hasText(normalizedCity)) {
                        reference.getCities().add(normalizedCity);
                    }
                }
            }
        }
    }

    private String selectDisplayName(String existing, String candidate) {
        return List.of(existing, candidate).stream()
                .filter(StringUtils::hasText)
                .min(Comparator.comparing(value -> value, String.CASE_INSENSITIVE_ORDER))
                .orElse(existing);
    }

    private String normalizeCountryCode(String code) {
        return StringUtils.hasText(code) ? code.trim().toUpperCase(Locale.ENGLISH) : null;
    }

    private String resolveCountryDisplayName(String countryCode, String fallbackName) {
        if (StringUtils.hasText(fallbackName)) {
            return fallbackName;
        }
        if (StringUtils.hasText(countryCode)) {
            Locale locale = new Locale("", countryCode);
            String displayName = locale.getDisplayCountry(Locale.ENGLISH);
            if (StringUtils.hasText(displayName)) {
                return displayName;
            }
        }
        return fallbackName;
    }

    private List<String> getStateNamesByCode(String countryCode) {
        if (countryCode == null) {
            return Collections.emptyList();
        }
        Map<String, StateReference> states = referenceStates.get(countryCode);
        if (states == null || states.isEmpty()) {
            return Collections.emptyList();
        }
        return states.values().stream()
                .map(StateReference::getDisplayName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    private List<String> getCityNamesByCode(String countryCode, String stateName) {
        if (countryCode == null) {
            return Collections.emptyList();
        }
        Map<String, StateReference> states = referenceStates.get(countryCode);
        if (states == null || states.isEmpty()) {
            return Collections.emptyList();
        }
        String normalizedState = normalizeKey(stateName);
        StateReference reference = Optional.ofNullable(states.get(normalizedState))
                .orElseGet(() -> states.values().stream()
                        .filter(state -> state.getDisplayName().equalsIgnoreCase(stateName))
                        .findFirst()
                        .orElse(null));
        if (reference == null) {
            return Collections.emptyList();
        }
        List<String> cities = new ArrayList<>(reference.getCities());
        cities.sort(String.CASE_INSENSITIVE_ORDER);
        return cities;
    }

    private void registerExternalCities(String countryCode, String countryName, String stateName, List<String> cities) {
        if (!StringUtils.hasText(countryCode) || !StringUtils.hasText(stateName) || CollectionUtils.isEmpty(cities)) {
            return;
        }
        registerCountryAlias(countryCode, countryName);
        registerLocaleAliases(countryCode);
        Map<String, StateReference> states = referenceStates.computeIfAbsent(countryCode, key -> new LinkedHashMap<>());
        String normalizedStateName = normalizeDisplayName(stateName);
        if (!StringUtils.hasText(normalizedStateName)) {
            return;
        }
        String stateKey = normalizeKey(normalizedStateName);
        StateReference reference = states.computeIfAbsent(stateKey, key -> new StateReference(normalizedStateName));
        if (!reference.getDisplayName().equals(normalizedStateName)) {
            reference.setDisplayName(selectDisplayName(reference.getDisplayName(), normalizedStateName));
        }
        for (String cityName : cities) {
            String normalizedCity = normalizeDisplayName(cityName);
            if (StringUtils.hasText(normalizedCity)) {
                reference.getCities().add(normalizedCity);
            }
        }
    }

    private String resolveCountryCodeByName(String countryName) {
        if (!StringUtils.hasText(countryName)) {
            return null;
        }
        String key = normalizeKey(countryName);
        if (key == null) {
            return null;
        }
        return countryAliases.get(key);
    }

    private void registerCountryAlias(String countryCode, String alias) {
        if (countryCode == null || !StringUtils.hasText(alias)) {
            return;
        }
        String key = normalizeKey(alias);
        if (key != null) {
            countryAliases.putIfAbsent(key, countryCode);
        }
    }

    private void registerLocaleAliases(String countryCode) {
        if (countryCode == null) {
            return;
        }
        registerCountryAlias(countryCode, countryCode);
        Locale englishLocale = new Locale("", countryCode);
        registerCountryAlias(countryCode, englishLocale.getDisplayCountry(Locale.ENGLISH));
        registerCountryAlias(countryCode, englishLocale.getDisplayCountry(Locale.US));
    }

    private String normalizeDisplayName(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeKey(String value) {
        String normalized = normalizeDisplayName(value);
        return normalized != null ? normalized.toLowerCase(Locale.ENGLISH) : null;
    }

    private static class CountrySeed {
        private String code;
        private List<StateSeed> states;
        private String name;
        private List<String> aliases;

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public List<StateSeed> getStates() {
            return states;
        }

        public void setStates(List<StateSeed> states) {
            this.states = states;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public List<String> getAliases() {
            return aliases;
        }

        public void setAliases(List<String> aliases) {
            this.aliases = aliases;
        }
    }

    private static class StateSeed {
        private String name;
        private List<String> cities;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public List<String> getCities() {
            return cities;
        }

        public void setCities(List<String> cities) {
            this.cities = cities;
        }
    }

    private static class StateReference {
        private String displayName;
        private final Set<String> cities = new LinkedHashSet<>();

        StateReference(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        public Set<String> getCities() {
            return cities;
        }
    }
}
