package com.example.rbac.admin.shipping.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.admin.shipping.dto.*;
import com.example.rbac.admin.shipping.model.ShippingCity;
import com.example.rbac.admin.shipping.model.ShippingCountry;
import com.example.rbac.admin.shipping.model.ShippingState;
import com.example.rbac.admin.shipping.reference.ShippingReferenceData;
import com.example.rbac.admin.shipping.repository.ShippingAreaRateRepository;
import com.example.rbac.admin.shipping.repository.ShippingCityRepository;
import com.example.rbac.admin.shipping.repository.ShippingCountryRepository;
import com.example.rbac.admin.shipping.repository.ShippingStateRepository;
import com.example.rbac.admin.shipping.dto.ShippingRateQuoteDto;
import org.hibernate.Hibernate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ShippingLocationService {

    private final ShippingCountryRepository countryRepository;
    private final ShippingStateRepository stateRepository;
    private final ShippingCityRepository cityRepository;
    private final ShippingAreaRateRepository areaRateRepository;
    private final ShippingReferenceData shippingReferenceData;
    private final ActivityRecorder activityRecorder;

    public ShippingLocationService(ShippingCountryRepository countryRepository,
                                   ShippingStateRepository stateRepository,
                                   ShippingCityRepository cityRepository,
                                   ShippingAreaRateRepository areaRateRepository,
                                   ActivityRecorder activityRecorder,
                                   ShippingReferenceData shippingReferenceData) {
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.areaRateRepository = areaRateRepository;
        this.activityRecorder = activityRecorder;
        this.shippingReferenceData = shippingReferenceData;
    }

    public List<ShippingCountryDto> listCountries() {
        return countryRepository.findAllByOrderByEnabledDescNameAsc()
                .stream()
                .map(this::toCountryDto)
                .collect(Collectors.toList());
    }

    public List<ShippingOptionDto> countryOptions() {
        return countryRepository.findAllByOrderByEnabledDescNameAsc()
                .stream()
                .map(country -> new ShippingOptionDto(country.getId(), country.getName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> enabledCountryOptions() {
        return countryRepository.findByEnabledTrueOrderByNameAsc()
                .stream()
                .map(country -> new ShippingOptionDto(country.getId(), country.getName()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ShippingCountryDto createCountry(ShippingCountryRequest request) {
        ShippingCountry country = new ShippingCountry();
        applyCountryRequest(country, request);
        ensureUniqueCountry(country.getName(), country.getCode(), null);
        ShippingCountry saved = countryRepository.save(country);
        activityRecorder.record("Shipping", "SHIPPING_COUNTRY_CREATED", "Created shipping country " + saved.getName(), "SUCCESS", null);
        return toCountryDto(saved);
    }

    @Transactional
    public ShippingCountryDto updateCountry(Long id, ShippingCountryRequest request) {
        ShippingCountry country = countryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
        applyCountryRequest(country, request);
        ensureUniqueCountry(country.getName(), country.getCode(), country.getId());
        ShippingCountry saved = countryRepository.save(country);
        activityRecorder.record("Shipping", "SHIPPING_COUNTRY_UPDATED", "Updated shipping country " + saved.getName(), "SUCCESS", null);
        return toCountryDto(saved);
    }

    @Transactional
    public ShippingCountryDto updateCountrySettings(Long id, ShippingCountrySettingsRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Country settings payload is required");
        }
        ShippingCountry country = countryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));

        boolean changed = false;
        if (Boolean.TRUE.equals(request.getClearCost())) {
            country.setBaseCost(null);
            changed = true;
        } else if (request.getCostValue() != null) {
            country.setBaseCost(sanitizeCost(request.getCostValue(), "Country rate"));
            changed = true;
        }

        if (request.getEnabled() != null) {
            boolean enabled = request.getEnabled();
            country.setEnabled(enabled);
            changed = true;
            if (!enabled) {
                disableStatesAndCities(country);
            }
        }

        if (changed) {
            ShippingCountry saved = countryRepository.save(country);
            activityRecorder.record("Shipping", "SHIPPING_COUNTRY_SETTINGS_UPDATED",
                    "Updated shipping country settings for " + saved.getName(), "SUCCESS", null);
            return toCountryDto(saved);
        }
        return toCountryDto(country);
    }

    @Transactional
    public void deleteCountry(Long id) {
        ShippingCountry country = countryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
        if (areaRateRepository.existsByCountryId(country.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to delete country while area rates exist");
        }
        try {
            countryRepository.delete(country);
            activityRecorder.record("Shipping", "SHIPPING_COUNTRY_DELETED", "Deleted shipping country " + country.getName(), "SUCCESS", null);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to delete country while dependent states or cities remain");
        }
    }

    @Transactional(readOnly = true)
    public List<ShippingStateDto> listStates(Long countryId) {
        ShippingCountry country = getCountryOrThrow(countryId);
        Hibernate.initialize(country);
        ensureReferenceStates(country);
        return stateRepository.findByCountryIdOrderByEnabledDescNameAsc(country.getId())
                .stream()
                .map(this::toStateDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> stateOptions(Long countryId) {
        ShippingCountry country = getCountryOrThrow(countryId);
        Hibernate.initialize(country);
        ensureReferenceStates(country);
        return stateRepository.findByCountryIdOrderByEnabledDescNameAsc(country.getId())
                .stream()
                .map(state -> new ShippingOptionDto(state.getId(), state.getName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> enabledStateOptions(Long countryId) {
        ShippingCountry country = getCountryOrThrow(countryId);
        Hibernate.initialize(country);
        if (!country.isEnabled()) {
            return List.of();
        }
        ensureReferenceStates(country);
        return stateRepository.findByCountryIdAndEnabledTrueOrderByNameAsc(country.getId())
                .stream()
                .map(state -> new ShippingOptionDto(state.getId(), state.getName()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ShippingStateDto createState(ShippingStateRequest request) {
        Long countryId = request.getCountryId();
        if (countryId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Country is required");
        }
        ShippingCountry country = countryRepository.findById(countryId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
        ShippingState state = new ShippingState();
        state.setCountry(country);
        applyStateRequest(state, request);
        ensureUniqueState(country.getId(), state.getName(), null);
        ShippingState saved = stateRepository.save(state);
        activityRecorder.record("Shipping", "SHIPPING_STATE_CREATED", "Created shipping state " + saved.getName(), "SUCCESS", null);
        return toStateDto(saved);
    }

    @Transactional
    public ShippingStateDto updateState(Long id, ShippingStateRequest request) {
        ShippingState state = stateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
        Long requestedCountryId = request.getCountryId() != null ? request.getCountryId() : state.getCountry().getId();
        ShippingCountry country = countryRepository.findById(requestedCountryId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
        state.setCountry(country);
        applyStateRequest(state, request);
        ensureUniqueState(country.getId(), state.getName(), state.getId());
        ShippingState saved = stateRepository.save(state);
        activityRecorder.record("Shipping", "SHIPPING_STATE_UPDATED", "Updated shipping state " + saved.getName(), "SUCCESS", null);
        return toStateDto(saved);
    }

    @Transactional
    public ShippingStateDto updateStateSettings(Long id, ShippingStateSettingsRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "State settings payload is required");
        }
        ShippingState state = stateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));

        boolean changed = false;
        if (Boolean.TRUE.equals(request.getClearOverride())) {
            state.setOverrideCost(null);
            changed = true;
        } else if (request.getOverrideCost() != null) {
            state.setOverrideCost(sanitizeCost(request.getOverrideCost(), "State override rate"));
            changed = true;
        }

        if (request.getEnabled() != null) {
            boolean enabled = request.getEnabled();
            if (enabled && (state.getCountry() == null || !state.getCountry().isEnabled())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enable the country before activating a state");
            }
            state.setEnabled(enabled);
            changed = true;
            if (!enabled) {
                disableCities(state);
            }
        }

        if (changed) {
            ShippingState saved = stateRepository.save(state);
            activityRecorder.record("Shipping", "SHIPPING_STATE_SETTINGS_UPDATED",
                    "Updated shipping state settings for " + saved.getName(), "SUCCESS", null);
            return toStateDto(saved);
        }
        return toStateDto(state);
    }

    @Transactional
    public void deleteState(Long id) {
        ShippingState state = stateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
        if (areaRateRepository.existsByStateId(state.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to delete state while area rates reference it");
        }
        try {
            stateRepository.delete(state);
            activityRecorder.record("Shipping", "SHIPPING_STATE_DELETED", "Deleted shipping state " + state.getName(), "SUCCESS", null);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to delete state while dependent cities or area rates remain");
        }
    }

    @Transactional(readOnly = true)
    public List<ShippingCityDto> listCities(Long stateId) {
        ShippingState state = getStateOrThrow(stateId);
        Hibernate.initialize(state);
        if (state.getCountry() != null) {
            Hibernate.initialize(state.getCountry());
        }
        ensureReferenceStates(state.getCountry());
        ensureReferenceCities(state);
        List<ShippingCity> cities = cityRepository.findByStateIdOrderByEnabledDescNameAsc(state.getId());
        for (ShippingCity city : cities) {
            if (city.getState() != null) {
                Hibernate.initialize(city.getState());
                if (city.getState().getCountry() != null) {
                    Hibernate.initialize(city.getState().getCountry());
                }
            }
        }
        return cities.stream()
                .map(this::toCityDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ShippingRateQuoteDto resolveShippingRate(Long countryId, Long stateId, Long cityId) {
        ShippingCountry country = null;
        if (countryId != null) {
            country = countryRepository.findById(countryId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
        }
        ShippingState state = null;
        if (stateId != null) {
            state = stateRepository.findById(stateId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
            if (country != null && state.getCountry() != null && !Objects.equals(state.getCountry().getId(), country.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Selected state does not belong to the provided country");
            }
            if (country == null) {
                country = state.getCountry();
            }
        }
        ShippingCity city = null;
        if (cityId != null) {
            city = cityRepository.findById(cityId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "City not found"));
            if (state != null && city.getState() != null && !Objects.equals(city.getState().getId(), state.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Selected city does not belong to the provided state");
            }
            if (state == null) {
                state = city.getState();
            }
            if (country == null && state != null) {
                country = state.getCountry();
            }
        }

        BigDecimal countryCost = country != null ? normalizeCost(country.getBaseCost()) : null;
        BigDecimal stateCost = state != null ? normalizeCost(state.getOverrideCost()) : null;
        BigDecimal cityCost = city != null ? normalizeCost(city.getOverrideCost()) : null;

        BigDecimal effective = cityCost != null
                ? cityCost
                : stateCost != null ? stateCost : countryCost;

        ShippingRateQuoteDto dto = new ShippingRateQuoteDto();
        dto.setCountryId(country != null ? country.getId() : null);
        dto.setCountryName(country != null ? country.getName() : null);
        dto.setCountryCost(countryCost);
        dto.setStateId(state != null ? state.getId() : null);
        dto.setStateName(state != null ? state.getName() : null);
        dto.setStateCost(stateCost);
        dto.setCityId(city != null ? city.getId() : null);
        dto.setCityName(city != null ? city.getName() : null);
        dto.setCityCost(cityCost);
        dto.setEffectiveCost(effective);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> cityOptions(Long stateId) {
        ShippingState state = getStateOrThrow(stateId);
        Hibernate.initialize(state);
        if (state.getCountry() != null) {
            Hibernate.initialize(state.getCountry());
        }
        ensureReferenceStates(state.getCountry());
        ensureReferenceCities(state);
        return cityRepository.findByStateIdOrderByEnabledDescNameAsc(state.getId())
                .stream()
                .map(city -> new ShippingOptionDto(city.getId(), city.getName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> enabledCityOptions(Long stateId) {
        ShippingState state = getStateOrThrow(stateId);
        Hibernate.initialize(state);
        if (state.getCountry() != null) {
            Hibernate.initialize(state.getCountry());
        }
        if (!state.isEnabled() || (state.getCountry() != null && !state.getCountry().isEnabled())) {
            return List.of();
        }
        ensureReferenceCities(state);
        return cityRepository.findByStateIdAndEnabledTrueOrderByNameAsc(state.getId())
                .stream()
                .map(city -> new ShippingOptionDto(city.getId(), city.getName()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ShippingCityDto createCity(ShippingCityRequest request) {
        Long stateId = request.getStateId();
        if (stateId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "State is required");
        }
        ShippingState state = stateRepository.findById(stateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
        ShippingCity city = new ShippingCity();
        city.setState(state);
        applyCityRequest(city, request);
        ensureUniqueCity(state.getId(), city.getName(), null);
        ShippingCity saved = cityRepository.save(city);
        activityRecorder.record("Shipping", "SHIPPING_CITY_CREATED", "Created shipping city " + saved.getName(), "SUCCESS", null);
        return toCityDto(saved);
    }

    @Transactional
    public ShippingCityDto updateCity(Long id, ShippingCityRequest request) {
        ShippingCity city = cityRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "City not found"));
        Long targetStateId = request.getStateId() != null ? request.getStateId() : city.getState().getId();
        ShippingState state = stateRepository.findById(targetStateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
        city.setState(state);
        applyCityRequest(city, request);
        ensureUniqueCity(state.getId(), city.getName(), city.getId());
        ShippingCity saved = cityRepository.save(city);
        activityRecorder.record("Shipping", "SHIPPING_CITY_UPDATED", "Updated shipping city " + saved.getName(), "SUCCESS", null);
        return toCityDto(saved);
    }

    @Transactional
    public ShippingCityDto updateCitySettings(Long id, ShippingCitySettingsRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "City settings payload is required");
        }
        ShippingCity city = cityRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "City not found"));

        boolean changed = false;
        if (Boolean.TRUE.equals(request.getClearOverride())) {
            city.setOverrideCost(null);
            changed = true;
        } else if (request.getOverrideCost() != null) {
            city.setOverrideCost(sanitizeCost(request.getOverrideCost(), "City override rate"));
            changed = true;
        }

        if (request.getEnabled() != null) {
            boolean enabled = request.getEnabled();
            ShippingState state = city.getState();
            if (enabled && (state == null || !state.isEnabled() || state.getCountry() == null || !state.getCountry().isEnabled())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enable the parent state and country before activating a city");
            }
            city.setEnabled(enabled);
            changed = true;
        }

        if (changed) {
            ShippingCity saved = cityRepository.save(city);
            activityRecorder.record("Shipping", "SHIPPING_CITY_SETTINGS_UPDATED",
                    "Updated shipping city settings for " + saved.getName(), "SUCCESS", null);
            return toCityDto(saved);
        }
        return toCityDto(city);
    }

    @Transactional
    public void deleteCity(Long id) {
        ShippingCity city = cityRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "City not found"));
        if (areaRateRepository.existsByCityId(city.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to delete city while area rates reference it");
        }
        try {
            cityRepository.delete(city);
            activityRecorder.record("Shipping", "SHIPPING_CITY_DELETED", "Deleted shipping city " + city.getName(), "SUCCESS", null);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to delete city while area rates reference it");
        }
    }

    @Transactional
    public List<ShippingCountryDto> bulkUpdateCountrySettings(ShippingCountryBulkSettingsRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Country settings payload is required");
        }
        if (request.getCostValue() != null && Boolean.TRUE.equals(request.getClearCost())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Provide either a rate value or clear the rate, not both");
        }
        List<Long> ids = requireIds(request.getIds(), "country");
        Map<Long, ShippingCountry> countryMap = countryRepository.findAllById(ids)
                .stream()
                .collect(Collectors.toMap(ShippingCountry::getId, Function.identity()));
        if (countryMap.size() != ids.size()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "One or more countries were not found");
        }

        boolean updated = false;
        for (Long id : ids) {
            ShippingCountry country = countryMap.get(id);
            if (country == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Country not found");
            }
            boolean changed = false;

            if (request.getEnabled() != null && country.isEnabled() != request.getEnabled()) {
                country.setEnabled(request.getEnabled());
                changed = true;
                if (!request.getEnabled()) {
                    disableStatesAndCities(country);
                }
            }

            if (Boolean.TRUE.equals(request.getClearCost())) {
                if (country.getBaseCost() != null) {
                    country.setBaseCost(null);
                    changed = true;
                }
            } else if (request.getCostValue() != null) {
                BigDecimal sanitized = sanitizeCost(request.getCostValue(), "Country rate");
                BigDecimal current = normalizeCost(country.getBaseCost());
                if (!Objects.equals(current, sanitized)) {
                    country.setBaseCost(sanitized);
                    changed = true;
                }
            }

            if (changed) {
                updated = true;
            }
        }

        List<ShippingCountry> orderedCountries = ids.stream()
                .map(countryMap::get)
                .collect(Collectors.toList());

        if (updated) {
            countryRepository.saveAll(orderedCountries);
            activityRecorder.record("Shipping", "SHIPPING_COUNTRY_BULK_SETTINGS_UPDATED",
                    "Updated shipping country settings for " + orderedCountries.size() + " selection(s)", "SUCCESS", null);
        }

        return orderedCountries.stream()
                .map(this::toCountryDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ShippingStateDto> bulkUpdateStateSettings(ShippingStateBulkSettingsRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "State settings payload is required");
        }
        if (request.getOverrideCost() != null && Boolean.TRUE.equals(request.getClearOverride())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Provide either an override value or clear the override, not both");
        }
        List<Long> ids = requireIds(request.getIds(), "state");
        Map<Long, ShippingState> stateMap = stateRepository.findByIdIn(ids)
                .stream()
                .collect(Collectors.toMap(ShippingState::getId, Function.identity()));
        if (stateMap.size() != ids.size()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "One or more states were not found");
        }

        boolean updated = false;
        for (Long id : ids) {
            ShippingState state = stateMap.get(id);
            if (state == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "State not found");
            }
            boolean changed = false;

            if (request.getEnabled() != null && state.isEnabled() != request.getEnabled()) {
                if (request.getEnabled() && (state.getCountry() == null || !state.getCountry().isEnabled())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Enable the country before activating a state");
                }
                state.setEnabled(request.getEnabled());
                changed = true;
                if (!request.getEnabled()) {
                    disableCities(state);
                }
            }

            if (Boolean.TRUE.equals(request.getClearOverride())) {
                if (state.getOverrideCost() != null) {
                    state.setOverrideCost(null);
                    changed = true;
                }
            } else if (request.getOverrideCost() != null) {
                BigDecimal sanitized = sanitizeCost(request.getOverrideCost(), "State override rate");
                BigDecimal current = normalizeCost(state.getOverrideCost());
                if (!Objects.equals(current, sanitized)) {
                    state.setOverrideCost(sanitized);
                    changed = true;
                }
            }

            if (changed) {
                updated = true;
            }
        }

        List<ShippingState> orderedStates = ids.stream()
                .map(stateMap::get)
                .collect(Collectors.toList());

        if (updated) {
            stateRepository.saveAll(orderedStates);
            activityRecorder.record("Shipping", "SHIPPING_STATE_BULK_SETTINGS_UPDATED",
                    "Updated shipping state settings for " + orderedStates.size() + " selection(s)", "SUCCESS", null);
        }

        return orderedStates.stream()
                .map(this::toStateDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ShippingCityDto> bulkUpdateCitySettings(ShippingCityBulkSettingsRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "City settings payload is required");
        }
        if (request.getOverrideCost() != null && Boolean.TRUE.equals(request.getClearOverride())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Provide either an override value or clear the override, not both");
        }
        List<Long> ids = requireIds(request.getIds(), "city");
        Map<Long, ShippingCity> cityMap = cityRepository.findByIdIn(ids)
                .stream()
                .collect(Collectors.toMap(ShippingCity::getId, Function.identity()));
        if (cityMap.size() != ids.size()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "One or more cities were not found");
        }

        boolean updated = false;
        for (Long id : ids) {
            ShippingCity city = cityMap.get(id);
            if (city == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "City not found");
            }
            boolean changed = false;

            if (request.getEnabled() != null && city.isEnabled() != request.getEnabled()) {
                ShippingState state = city.getState();
                if (request.getEnabled()) {
                    if (state == null || !state.isEnabled() || state.getCountry() == null || !state.getCountry().isEnabled()) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                "Enable the parent state and country before activating a city");
                    }
                }
                city.setEnabled(request.getEnabled());
                changed = true;
            }

            if (Boolean.TRUE.equals(request.getClearOverride())) {
                if (city.getOverrideCost() != null) {
                    city.setOverrideCost(null);
                    changed = true;
                }
            } else if (request.getOverrideCost() != null) {
                BigDecimal sanitized = sanitizeCost(request.getOverrideCost(), "City override rate");
                BigDecimal current = normalizeCost(city.getOverrideCost());
                if (!Objects.equals(current, sanitized)) {
                    city.setOverrideCost(sanitized);
                    changed = true;
                }
            }

            if (changed) {
                updated = true;
            }
        }

        List<ShippingCity> orderedCities = ids.stream()
                .map(cityMap::get)
                .collect(Collectors.toList());

        if (updated) {
            cityRepository.saveAll(orderedCities);
            activityRecorder.record("Shipping", "SHIPPING_CITY_BULK_SETTINGS_UPDATED",
                    "Updated shipping city settings for " + orderedCities.size() + " selection(s)", "SUCCESS", null);
        }

        return orderedCities.stream()
                .map(this::toCityDto)
                .collect(Collectors.toList());
    }

    private void applyCountryRequest(ShippingCountry country, ShippingCountryRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Country payload is required");
        }
        String name = request.getName() != null ? request.getName().trim() : null;
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Country name is required");
        }
        country.setName(name);
        String code = request.getCode();
        if (StringUtils.hasText(code)) {
            country.setCode(code.trim().toUpperCase(Locale.ROOT));
        } else {
            country.setCode(null);
        }
    }

    private void applyStateRequest(ShippingState state, ShippingStateRequest request) {
        String name = request.getName() != null ? request.getName().trim() : null;
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "State name is required");
        }
        state.setName(name);
    }

    private void applyCityRequest(ShippingCity city, ShippingCityRequest request) {
        String name = request.getName() != null ? request.getName().trim() : null;
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "City name is required");
        }
        city.setName(name);
    }

    private BigDecimal sanitizeCost(BigDecimal value, String label) {
        BigDecimal normalized = normalizeCost(value);
        if (normalized != null && normalized.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, label + " cannot be negative");
        }
        return normalized;
    }

    private BigDecimal normalizeCost(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private void disableStatesAndCities(ShippingCountry country) {
        if (country.getId() == null) {
            return;
        }
        List<ShippingState> states = stateRepository.findByCountryIdOrderByNameAsc(country.getId());
        List<ShippingState> statesToUpdate = new ArrayList<>();
        List<ShippingCity> citiesToUpdate = new ArrayList<>();
        for (ShippingState state : states) {
            if (state.isEnabled()) {
                state.setEnabled(false);
                statesToUpdate.add(state);
            }
            List<ShippingCity> cities = cityRepository.findByStateIdOrderByNameAsc(state.getId());
            for (ShippingCity city : cities) {
                if (city.isEnabled()) {
                    city.setEnabled(false);
                    citiesToUpdate.add(city);
                }
            }
        }
        if (!statesToUpdate.isEmpty()) {
            stateRepository.saveAll(statesToUpdate);
        }
        if (!citiesToUpdate.isEmpty()) {
            cityRepository.saveAll(citiesToUpdate);
        }
    }

    private void disableCities(ShippingState state) {
        if (state.getId() == null) {
            return;
        }
        List<ShippingCity> cities = cityRepository.findByStateIdOrderByNameAsc(state.getId());
        List<ShippingCity> updated = new ArrayList<>();
        for (ShippingCity city : cities) {
            if (city.isEnabled()) {
                city.setEnabled(false);
                updated.add(city);
            }
        }
        if (!updated.isEmpty()) {
            cityRepository.saveAll(updated);
        }
    }

    private void ensureReferenceStates(ShippingCountry country) {
        if (country == null || country.getId() == null) {
            return;
        }
        if (isCurrentTransactionReadOnly()) {
            return;
        }
        List<String> referenceStates = shippingReferenceData.getStateNames(country.getCode(), country.getName());
        if (referenceStates.isEmpty()) {
            return;
        }
        List<ShippingState> existingStates = stateRepository.findByCountryIdOrderByNameAsc(country.getId());
        Map<String, ShippingState> existingByKey = new HashMap<>();
        for (ShippingState existing : existingStates) {
            String key = normalizeKey(existing.getName());
            if (key != null) {
                existingByKey.putIfAbsent(key, existing);
            }
        }
        boolean created = false;
        for (String stateName : referenceStates) {
            String normalizedName = normalizeName(stateName);
            if (!StringUtils.hasText(normalizedName)) {
                continue;
            }
            String key = normalizeKey(normalizedName);
            if (key == null || existingByKey.containsKey(key)) {
                continue;
            }
            ShippingState state = new ShippingState();
            state.setCountry(country);
            state.setName(normalizedName);
            state.setEnabled(false);
            ShippingState saved = stateRepository.save(state);
            existingByKey.put(key, saved);
            created = true;
        }
        if (created) {
            stateRepository.flush();
        }
    }

    private void ensureReferenceCities(ShippingState state) {
        if (state == null || state.getId() == null || state.getCountry() == null) {
            return;
        }
        if (isCurrentTransactionReadOnly()) {
            return;
        }
        List<String> referenceCities = shippingReferenceData.getCityNames(
                state.getCountry().getCode(),
                state.getCountry().getName(),
                state.getName());
        if (referenceCities.isEmpty()) {
            return;
        }
        List<ShippingCity> existingCities = cityRepository.findByStateIdOrderByNameAsc(state.getId());
        Set<String> existingKeys = new HashSet<>();
        for (ShippingCity city : existingCities) {
            String key = normalizeKey(city.getName());
            if (key != null) {
                existingKeys.add(key);
            }
        }
        boolean created = false;
        for (String cityName : referenceCities) {
            String normalizedName = normalizeName(cityName);
            if (!StringUtils.hasText(normalizedName)) {
                continue;
            }
            String key = normalizeKey(normalizedName);
            if (key == null || !existingKeys.add(key)) {
                continue;
            }
            ShippingCity city = new ShippingCity();
            city.setState(state);
            city.setName(normalizedName);
            city.setEnabled(false);
            cityRepository.save(city);
            created = true;
        }
        if (created) {
            cityRepository.flush();
        }
    }

    private boolean isCurrentTransactionReadOnly() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly();
    }

    private ShippingCountry getCountryOrThrow(Long countryId) {
        if (countryId == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Country not found");
        }
        return countryRepository.findById(countryId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
    }

    private ShippingState getStateOrThrow(Long stateId) {
        if (stateId == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "State not found");
        }
        return stateRepository.findWithCountryById(stateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
    }

    private String normalizeName(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeKey(String value) {
        String normalized = normalizeName(value);
        return normalized != null ? normalized.toLowerCase(Locale.ENGLISH) : null;
    }

    private List<Long> requireIds(List<Long> ids, String label) {
        if (ids == null || ids.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one " + label + " to update.");
        }
        LinkedHashSet<Long> normalized = ids.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (normalized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one " + label + " to update.");
        }
        return new ArrayList<>(normalized);
    }

    private void ensureUniqueCountry(String name, String code, Long countryId) {
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Country name is required");
        }
        if (countryId == null) {
            if (countryRepository.existsByNameIgnoreCase(name)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A country with this name already exists");
            }
        } else {
            if (countryRepository.existsByNameIgnoreCaseAndIdNot(name, countryId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A country with this name already exists");
            }
        }
        if (StringUtils.hasText(code)) {
            if (countryId == null) {
                if (countryRepository.existsByCodeIgnoreCase(code)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "A country with this code already exists");
                }
            } else {
                if (countryRepository.existsByCodeIgnoreCaseAndIdNot(code, countryId)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "A country with this code already exists");
                }
            }
        }
    }

    private void ensureUniqueState(Long countryId, String name, Long stateId) {
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "State name is required");
        }
        boolean exists = stateId == null
                ? stateRepository.existsByCountryIdAndNameIgnoreCase(countryId, name)
                : stateRepository.existsByCountryIdAndNameIgnoreCaseAndIdNot(countryId, name, stateId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A state with this name already exists in the selected country");
        }
    }

    private void ensureUniqueCity(Long stateId, String name, Long cityId) {
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "City name is required");
        }
        boolean exists = cityId == null
                ? cityRepository.existsByStateIdAndNameIgnoreCase(stateId, name)
                : cityRepository.existsByStateIdAndNameIgnoreCaseAndIdNot(stateId, name, cityId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A city with this name already exists in the selected state");
        }
    }

    private ShippingCountryDto toCountryDto(ShippingCountry country) {
        ShippingCountryDto dto = new ShippingCountryDto();
        dto.setId(country.getId());
        dto.setName(country.getName());
        dto.setCode(country.getCode());
        dto.setEnabled(country.isEnabled());
        BigDecimal normalizedCost = normalizeCost(country.getBaseCost());
        dto.setCostValue(normalizedCost);
        dto.setEffectiveCost(normalizedCost);
        dto.setCreatedAt(country.getCreatedAt());
        dto.setUpdatedAt(country.getUpdatedAt());
        return dto;
    }

    private ShippingStateDto toStateDto(ShippingState state) {
        ShippingStateDto dto = new ShippingStateDto();
        dto.setId(state.getId());
        dto.setName(state.getName());
        dto.setCountryId(state.getCountry() != null ? state.getCountry().getId() : null);
        dto.setEnabled(state.isEnabled());
        BigDecimal inheritedCost = state.getCountry() != null ? normalizeCost(state.getCountry().getBaseCost()) : null;
        BigDecimal overrideCost = normalizeCost(state.getOverrideCost());
        dto.setOverrideCost(overrideCost);
        dto.setInheritedCost(inheritedCost);
        dto.setEffectiveCost(overrideCost != null ? overrideCost : inheritedCost);
        dto.setCreatedAt(state.getCreatedAt());
        dto.setUpdatedAt(state.getUpdatedAt());
        return dto;
    }

    private ShippingCityDto toCityDto(ShippingCity city) {
        ShippingCityDto dto = new ShippingCityDto();
        dto.setId(city.getId());
        dto.setName(city.getName());
        dto.setStateId(city.getState() != null ? city.getState().getId() : null);
        dto.setCountryId(city.getState() != null && city.getState().getCountry() != null ? city.getState().getCountry().getId() : null);
        dto.setEnabled(city.isEnabled());
        BigDecimal stateCost = null;
        if (city.getState() != null) {
            BigDecimal stateOverride = normalizeCost(city.getState().getOverrideCost());
            BigDecimal countryCost = city.getState().getCountry() != null ? normalizeCost(city.getState().getCountry().getBaseCost()) : null;
            stateCost = stateOverride != null ? stateOverride : countryCost;
        }
        BigDecimal overrideCost = normalizeCost(city.getOverrideCost());
        dto.setOverrideCost(overrideCost);
        dto.setInheritedCost(stateCost);
        dto.setEffectiveCost(overrideCost != null ? overrideCost : stateCost);
        dto.setCreatedAt(city.getCreatedAt());
        dto.setUpdatedAt(city.getUpdatedAt());
        return dto;
    }
}
