package com.example.rbac.shipping.bootstrap;

import com.example.rbac.shipping.model.ShippingCity;
import com.example.rbac.shipping.model.ShippingCountry;
import com.example.rbac.shipping.model.ShippingState;
import com.example.rbac.shipping.repository.ShippingCityRepository;
import com.example.rbac.shipping.repository.ShippingCountryRepository;
import com.example.rbac.shipping.repository.ShippingStateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class ShippingDataInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger(ShippingDataInitializer.class);

    private final ShippingCountryRepository countryRepository;
    private final ShippingStateRepository stateRepository;
    private final ShippingCityRepository cityRepository;
    private final ObjectMapper objectMapper;
    private final Resource indiaStatesResource;

    public ShippingDataInitializer(ShippingCountryRepository countryRepository,
                                   ShippingStateRepository stateRepository,
                                   ShippingCityRepository cityRepository,
                                   ObjectMapper objectMapper,
                                   @Value("classpath:data/shipping/india_states.json") Resource indiaStatesResource) {
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.objectMapper = objectMapper;
        this.indiaStatesResource = indiaStatesResource;
    }

    @PostConstruct
    @Transactional
    public void initialize() {
        seedCountries();
        seedIndiaStatesAndCities();
        seedDefaultStatesAndCities();
    }

    private void seedCountries() {
        String[] isoCountries = Locale.getISOCountries();
        for (String isoCode : isoCountries) {
            Locale locale = new Locale("", isoCode);
            String name = locale.getDisplayCountry(Locale.ENGLISH);
            if (!StringUtils.hasText(name)) {
                continue;
            }
            if (countryRepository.existsByCodeIgnoreCase(isoCode)
                    || countryRepository.existsByNameIgnoreCase(name)) {
                continue;
            }
            ShippingCountry country = new ShippingCountry();
            country.setName(name);
            country.setCode(isoCode);
            country.setEnabled(true);
            countryRepository.save(country);
        }
    }

    private void seedIndiaStatesAndCities() {
        ShippingCountry india = countryRepository.findByCodeIgnoreCase("IN")
                .orElse(null);
        if (india == null) {
            LOGGER.warn("Unable to seed India states because the country record was not found");
            return;
        }
        if (!indiaStatesResource.exists()) {
            LOGGER.warn("India states resource {} is missing", indiaStatesResource);
            return;
        }
        try (InputStream stream = indiaStatesResource.getInputStream()) {
            List<IndiaStateSeed> states = objectMapper.readValue(stream, new TypeReference<>() {});
            if (CollectionUtils.isEmpty(states)) {
                return;
            }
            List<ShippingState> existingStates = stateRepository.findByCountryIdOrderByNameAsc(india.getId());
            for (IndiaStateSeed stateSeed : states) {
                if (!StringUtils.hasText(stateSeed.getName())) {
                    continue;
                }
                ShippingState state = existingStates.stream()
                        .filter(existing -> existing.getName().equalsIgnoreCase(stateSeed.getName()))
                        .findFirst()
                        .orElseGet(() -> {
                            ShippingState created = new ShippingState();
                            created.setCountry(india);
                            created.setName(stateSeed.getName());
                            created.setEnabled(true);
                            ShippingState saved = stateRepository.save(created);
                            existingStates.add(saved);
                            return saved;
                        });

                if (!state.isEnabled()) {
                    state.setEnabled(true);
                    state = stateRepository.save(state);
                }

                List<ShippingCity> existingCities = cityRepository.findByStateIdOrderByNameAsc(state.getId());

                if (!CollectionUtils.isEmpty(existingCities)) {
                    boolean updated = false;
                    for (ShippingCity existingCity : existingCities) {
                        if (!existingCity.isEnabled()) {
                            existingCity.setEnabled(true);
                            updated = true;
                        }
                    }
                    if (updated) {
                        cityRepository.saveAll(existingCities);
                    }
                }

                if (CollectionUtils.isEmpty(stateSeed.getCities())) {
                    continue;
                }
                for (String cityName : stateSeed.getCities()) {
                    if (!StringUtils.hasText(cityName)) {
                        continue;
                    }
                    String normalizedCityName = cityName.trim();
                    ShippingCity city = existingCities.stream()
                            .filter(existing -> existing.getName().equalsIgnoreCase(normalizedCityName))
                            .findFirst()
                            .orElseGet(() -> {
                                ShippingCity created = new ShippingCity();
                                created.setState(state);
                                created.setName(normalizedCityName);
                                created.setEnabled(true);
                                ShippingCity saved = cityRepository.save(created);
                                existingCities.add(saved);
                                return saved;
                            });

                    if (!city.isEnabled()) {
                        city.setEnabled(true);
                        cityRepository.save(city);
                    }
                }
            }
        } catch (IOException ex) {
            LOGGER.warn("Failed to seed India states: {}", ex.getMessage());
        }
    }

    private void seedDefaultStatesAndCities() {
        List<ShippingCountry> countries = countryRepository.findAll();
        for (ShippingCountry country : countries) {
            List<ShippingState> states = stateRepository.findByCountryIdOrderByNameAsc(country.getId());
            if (states.isEmpty()) {
                states = createDefaultStates(country);
            }
            boolean stateUpdates = false;
            for (ShippingState state : states) {
                if (!state.isEnabled()) {
                    state.setEnabled(true);
                    stateUpdates = true;
                }
                ensureDefaultCities(state);
            }
            if (stateUpdates) {
                stateRepository.saveAll(states);
            }
        }
    }

    private List<ShippingState> createDefaultStates(ShippingCountry country) {
        String baseName = StringUtils.hasText(country.getName()) ? country.getName().trim() : country.getCode();
        if (!StringUtils.hasText(baseName)) {
            baseName = "Country " + country.getId();
        }
        String[] regionMarkers = {"Northern", "Central", "Southern"};
        List<ShippingState> createdStates = new ArrayList<>();
        for (String marker : regionMarkers) {
            String stateName = (baseName + " " + marker + " Region").replaceAll("\\s+", " ").trim();
            if (!StringUtils.hasText(stateName)) {
                continue;
            }
            if (stateRepository.existsByCountryIdAndNameIgnoreCase(country.getId(), stateName)) {
                continue;
            }
            ShippingState state = new ShippingState();
            state.setCountry(country);
            state.setName(stateName);
            state.setEnabled(true);
            ShippingState saved = stateRepository.save(state);
            createdStates.add(saved);
        }

        if (createdStates.isEmpty()) {
            String fallbackName = (baseName + " Region").replaceAll("\\s+", " ").trim();
            if (!stateRepository.existsByCountryIdAndNameIgnoreCase(country.getId(), fallbackName)) {
                ShippingState state = new ShippingState();
                state.setCountry(country);
                state.setName(fallbackName);
                state.setEnabled(true);
                ShippingState saved = stateRepository.save(state);
                createdStates.add(saved);
            }
        }
        return createdStates;
    }

    private void ensureDefaultCities(ShippingState state) {
        List<ShippingCity> cities = cityRepository.findByStateIdOrderByNameAsc(state.getId());
        if (!cities.isEmpty()) {
            boolean updated = false;
            for (ShippingCity city : cities) {
                if (!city.isEnabled()) {
                    city.setEnabled(true);
                    updated = true;
                }
            }
            if (updated) {
                cityRepository.saveAll(cities);
            }
            return;
        }
        String baseName = StringUtils.hasText(state.getName()) ? state.getName().trim() : "State " + state.getId();
        String[] cityMarkers = {"Metropolitan", "Harbor", "Valley"};
        for (String marker : cityMarkers) {
            String cityName = (baseName + " " + marker + " City").replaceAll("\\s+", " ").trim();
            if (!StringUtils.hasText(cityName)) {
                continue;
            }
            if (cityRepository.existsByStateIdAndNameIgnoreCase(state.getId(), cityName)) {
                continue;
            }
            ShippingCity city = new ShippingCity();
            city.setState(state);
            city.setName(cityName);
            city.setEnabled(true);
            cityRepository.save(city);
        }
    }

    private static class IndiaStateSeed {
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
}
