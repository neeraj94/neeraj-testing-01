package com.example.rbac.shipping.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.shipping.dto.*;
import com.example.rbac.shipping.model.ShippingCity;
import com.example.rbac.shipping.model.ShippingCountry;
import com.example.rbac.shipping.model.ShippingState;
import com.example.rbac.shipping.repository.ShippingAreaRateRepository;
import com.example.rbac.shipping.repository.ShippingCityRepository;
import com.example.rbac.shipping.repository.ShippingCountryRepository;
import com.example.rbac.shipping.repository.ShippingStateRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ShippingLocationService {

    private final ShippingCountryRepository countryRepository;
    private final ShippingStateRepository stateRepository;
    private final ShippingCityRepository cityRepository;
    private final ShippingAreaRateRepository areaRateRepository;
    private final ActivityRecorder activityRecorder;

    public ShippingLocationService(ShippingCountryRepository countryRepository,
                                   ShippingStateRepository stateRepository,
                                   ShippingCityRepository cityRepository,
                                   ShippingAreaRateRepository areaRateRepository,
                                   ActivityRecorder activityRecorder) {
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.areaRateRepository = areaRateRepository;
        this.activityRecorder = activityRecorder;
    }

    public List<ShippingCountryDto> listCountries() {
        return countryRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::toCountryDto)
                .collect(Collectors.toList());
    }

    public List<ShippingOptionDto> countryOptions() {
        return countryRepository.findAllByOrderByNameAsc()
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

    public List<ShippingStateDto> listStates(Long countryId) {
        ensureCountryExists(countryId);
        return stateRepository.findByCountryIdOrderByNameAsc(countryId)
                .stream()
                .map(this::toStateDto)
                .collect(Collectors.toList());
    }

    public List<ShippingOptionDto> stateOptions(Long countryId) {
        ensureCountryExists(countryId);
        return stateRepository.findByCountryIdOrderByNameAsc(countryId)
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

    public List<ShippingCityDto> listCities(Long stateId) {
        ensureStateExists(stateId);
        return cityRepository.findByStateIdOrderByNameAsc(stateId)
                .stream()
                .map(this::toCityDto)
                .collect(Collectors.toList());
    }

    public List<ShippingOptionDto> cityOptions(Long stateId) {
        ensureStateExists(stateId);
        return cityRepository.findByStateIdOrderByNameAsc(stateId)
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
        country.setCode(StringUtils.hasText(code) ? code.trim() : null);
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

    private void ensureCountryExists(Long countryId) {
        if (countryId == null || !countryRepository.existsById(countryId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Country not found");
        }
    }

    private void ensureStateExists(Long stateId) {
        if (stateId == null || !stateRepository.existsById(stateId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "State not found");
        }
    }

    private ShippingCountryDto toCountryDto(ShippingCountry country) {
        ShippingCountryDto dto = new ShippingCountryDto();
        dto.setId(country.getId());
        dto.setName(country.getName());
        dto.setCode(country.getCode());
        dto.setCreatedAt(country.getCreatedAt());
        dto.setUpdatedAt(country.getUpdatedAt());
        return dto;
    }

    private ShippingStateDto toStateDto(ShippingState state) {
        ShippingStateDto dto = new ShippingStateDto();
        dto.setId(state.getId());
        dto.setName(state.getName());
        dto.setCountryId(state.getCountry() != null ? state.getCountry().getId() : null);
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
        dto.setCreatedAt(city.getCreatedAt());
        dto.setUpdatedAt(city.getUpdatedAt());
        return dto;
    }
}
