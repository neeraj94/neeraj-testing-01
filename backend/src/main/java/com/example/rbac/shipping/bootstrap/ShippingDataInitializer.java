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
                            ShippingState saved = stateRepository.save(created);
                            existingStates.add(saved);
                            return saved;
                        });

                if (CollectionUtils.isEmpty(stateSeed.getCities())) {
                    continue;
                }
                for (String cityName : stateSeed.getCities()) {
                    if (!StringUtils.hasText(cityName)) {
                        continue;
                    }
                    boolean exists = cityRepository.existsByStateIdAndNameIgnoreCase(state.getId(), cityName.trim());
                    if (exists) {
                        continue;
                    }
                    ShippingCity city = new ShippingCity();
                    city.setState(state);
                    city.setName(cityName.trim());
                    cityRepository.save(city);
                }
            }
        } catch (IOException ex) {
            LOGGER.warn("Failed to seed India states: {}", ex.getMessage());
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
