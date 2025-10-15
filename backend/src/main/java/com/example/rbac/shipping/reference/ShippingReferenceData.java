package com.example.rbac.shipping.reference;

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

    private final Map<String, Map<String, StateReference>> referenceStates = new LinkedHashMap<>();

    public ShippingReferenceData(ObjectMapper objectMapper,
                                 @Value("classpath:data/shipping/global_states_cities.json") Resource globalStatesResource,
                                 @Value("classpath:data/shipping/india_states.json") Resource indiaStatesResource) {
        this.objectMapper = objectMapper;
        this.globalStatesResource = globalStatesResource;
        this.indiaStatesResource = indiaStatesResource;
    }

    @PostConstruct
    public void loadReferenceData() {
        loadGlobalStates();
        loadIndiaStates();
    }

    public List<String> getStateNames(String countryCode) {
        Map<String, StateReference> states = referenceStates.get(normalizeCountryCode(countryCode));
        if (states == null || states.isEmpty()) {
            return Collections.emptyList();
        }
        return states.values().stream()
                .map(StateReference::getDisplayName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    public List<String> getCityNames(String countryCode, String stateName) {
        if (!StringUtils.hasText(stateName)) {
            return Collections.emptyList();
        }
        Map<String, StateReference> states = referenceStates.get(normalizeCountryCode(countryCode));
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
