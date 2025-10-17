package com.example.rbac.shipping.bootstrap;

import com.example.rbac.shipping.model.ShippingCity;
import com.example.rbac.shipping.model.ShippingCountry;
import com.example.rbac.shipping.model.ShippingState;
import com.example.rbac.shipping.reference.ShippingReferenceData;
import com.example.rbac.shipping.repository.ShippingCityRepository;
import com.example.rbac.shipping.repository.ShippingCountryRepository;
import com.example.rbac.shipping.repository.ShippingStateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class ShippingDataInitializer implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(ShippingDataInitializer.class);

    private final ShippingCountryRepository countryRepository;
    private final ShippingStateRepository stateRepository;
    private final ShippingCityRepository cityRepository;
    private final ShippingReferenceData shippingReferenceData;
    private final ObjectMapper objectMapper;
    private final Resource indiaStatesResource;
    private final Resource globalStatesResource;

    public ShippingDataInitializer(ShippingCountryRepository countryRepository,
                                   ShippingStateRepository stateRepository,
                                   ShippingCityRepository cityRepository,
                                   ShippingReferenceData shippingReferenceData,
                                   ObjectMapper objectMapper,
                                   @Value("classpath:data/shipping/india_states.json") Resource indiaStatesResource,
                                   @Value("classpath:data/shipping/global_states_cities.json") Resource globalStatesResource) {
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.shippingReferenceData = shippingReferenceData;
        this.objectMapper = objectMapper;
        this.indiaStatesResource = indiaStatesResource;
        this.globalStatesResource = globalStatesResource;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedCountries();
        seedStructuredStates(globalStatesResource);
        seedIndiaStatesAndCities();
        seedDefaultStatesAndCities();
    }

    private void seedStructuredStates(Resource resource) {
        if (resource == null || !resource.exists()) {
            return;
        }
        try (InputStream stream = resource.getInputStream()) {
            List<CountrySeed> seeds = objectMapper.readValue(stream, new TypeReference<>() {
            });
            if (CollectionUtils.isEmpty(seeds)) {
                return;
            }
            for (CountrySeed countrySeed : seeds) {
                if (!StringUtils.hasText(countrySeed.getCode()) || CollectionUtils.isEmpty(countrySeed.getStates())) {
                    continue;
                }
                ShippingCountry country = countryRepository.findByCodeIgnoreCase(countrySeed.getCode())
                        .orElse(null);
                if (country == null) {
                    continue;
                }
                ensureStatesAndCities(country, countrySeed.getStates());
            }
        } catch (IOException ex) {
            LOGGER.warn("Failed to seed structured states: {}", ex.getMessage());
        }
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
            List<StateSeed> states = objectMapper.readValue(stream, new TypeReference<>() {
            });
            if (CollectionUtils.isEmpty(states)) {
                return;
            }
            ensureStatesAndCities(india, states);
        } catch (IOException ex) {
            LOGGER.warn("Failed to seed India states: {}", ex.getMessage());
        }
    }

    private void ensureStatesAndCities(ShippingCountry country, List<StateSeed> states) {
        if (country == null || CollectionUtils.isEmpty(states)) {
            return;
        }
        List<ShippingState> existingStates = new ArrayList<>(stateRepository.findByCountryIdOrderByNameAsc(country.getId()));
        for (StateSeed stateSeed : states) {
            if (!StringUtils.hasText(stateSeed.getName())) {
                continue;
            }
            String normalizedStateName = stateSeed.getName().trim();
            ShippingState state = existingStates.stream()
                    .filter(existing -> existing.getName().equalsIgnoreCase(normalizedStateName))
                    .findFirst()
                    .orElseGet(() -> {
                        ShippingState created = new ShippingState();
                        created.setCountry(country);
                        created.setName(normalizedStateName);
                        created.setEnabled(true);
                        ShippingState saved = stateRepository.save(created);
                        existingStates.add(saved);
                        return saved;
                    });

            if (!state.isEnabled()) {
                state.setEnabled(true);
                stateRepository.save(state);
            }

            List<ShippingCity> existingCities = new ArrayList<>(cityRepository.findByStateIdOrderByNameAsc(state.getId()));
            boolean citiesUpdated = false;
            for (ShippingCity existingCity : existingCities) {
                if (!existingCity.isEnabled()) {
                    existingCity.setEnabled(true);
                    citiesUpdated = true;
                }
            }

            if (!CollectionUtils.isEmpty(stateSeed.getCities())) {
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
                        citiesUpdated = true;
                    }
                }
            }

            if (citiesUpdated) {
                cityRepository.saveAll(existingCities);
            }
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
        boolean updated = false;
        Set<String> existingCityNames = new HashSet<>();
        for (ShippingCity city : cities) {
            if (!city.isEnabled()) {
                city.setEnabled(true);
                updated = true;
            }
            if (StringUtils.hasText(city.getName())) {
                existingCityNames.add(city.getName().trim().toLowerCase(Locale.ENGLISH));
            }
        }
        if (updated) {
            cityRepository.saveAll(cities);
        }

        List<String> referenceCities = Collections.emptyList();
        if (state.getCountry() != null) {
            referenceCities = shippingReferenceData.getCityNames(
                    state.getCountry().getCode(),
                    state.getCountry().getName(),
                    state.getName());
        }

        boolean createdFromReference = false;
        if (!CollectionUtils.isEmpty(referenceCities)) {
            for (String referenceCity : referenceCities) {
                if (!StringUtils.hasText(referenceCity)) {
                    continue;
                }
                String normalizedName = referenceCity.trim();
                String normalizedKey = normalizedName.toLowerCase(Locale.ENGLISH);
                if (existingCityNames.contains(normalizedKey)) {
                    continue;
                }
                ShippingCity city = new ShippingCity();
                city.setState(state);
                city.setName(normalizedName);
                city.setEnabled(true);
                cityRepository.save(city);
                existingCityNames.add(normalizedKey);
                createdFromReference = true;
            }
            if (createdFromReference) {
                return;
            }
        }

        if (!cities.isEmpty()) {
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
}
