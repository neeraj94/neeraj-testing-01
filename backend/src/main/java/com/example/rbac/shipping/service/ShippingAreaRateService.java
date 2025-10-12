package com.example.rbac.shipping.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.shipping.dto.ShippingAreaRateDto;
import com.example.rbac.shipping.dto.ShippingAreaRateRequest;
import com.example.rbac.shipping.model.ShippingAreaRate;
import com.example.rbac.shipping.model.ShippingCity;
import com.example.rbac.shipping.model.ShippingCountry;
import com.example.rbac.shipping.model.ShippingState;
import com.example.rbac.shipping.repository.ShippingAreaRateRepository;
import com.example.rbac.shipping.repository.ShippingCityRepository;
import com.example.rbac.shipping.repository.ShippingCountryRepository;
import com.example.rbac.shipping.repository.ShippingStateRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

@Service
public class ShippingAreaRateService {

    private final ShippingAreaRateRepository areaRateRepository;
    private final ShippingCountryRepository countryRepository;
    private final ShippingStateRepository stateRepository;
    private final ShippingCityRepository cityRepository;
    private final ActivityRecorder activityRecorder;

    public ShippingAreaRateService(ShippingAreaRateRepository areaRateRepository,
                                   ShippingCountryRepository countryRepository,
                                   ShippingStateRepository stateRepository,
                                   ShippingCityRepository cityRepository,
                                   ActivityRecorder activityRecorder) {
        this.areaRateRepository = areaRateRepository;
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.activityRecorder = activityRecorder;
    }

    public PageResponse<ShippingAreaRateDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "country.name").and(Sort.by("state.name")).and(Sort.by("city.name")));
        Page<ShippingAreaRate> result = areaRateRepository.search(StringUtils.hasText(search) ? search.trim() : null, pageable);
        return PageResponse.from(result.map(this::toDto));
    }

    public ShippingAreaRateDto get(Long id) {
        ShippingAreaRate rate = areaRateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Shipping rate not found"));
        return toDto(rate);
    }

    @Transactional
    public ShippingAreaRateDto create(ShippingAreaRateRequest request) {
        ShippingAreaRate rate = new ShippingAreaRate();
        applyRequest(rate, request);
        ensureUnique(rate, null);
        ShippingAreaRate saved = areaRateRepository.save(rate);
        activityRecorder.record("Shipping", "SHIPPING_AREA_CREATED", "Created area shipping rate for " + saved.getCity().getName(), "SUCCESS", buildContext(saved));
        return toDto(saved);
    }

    @Transactional
    public ShippingAreaRateDto update(Long id, ShippingAreaRateRequest request) {
        ShippingAreaRate rate = areaRateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Shipping rate not found"));
        applyRequest(rate, request);
        ensureUnique(rate, id);
        ShippingAreaRate saved = areaRateRepository.save(rate);
        activityRecorder.record("Shipping", "SHIPPING_AREA_UPDATED", "Updated area shipping rate for " + saved.getCity().getName(), "SUCCESS", buildContext(saved));
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        ShippingAreaRate rate = areaRateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Shipping rate not found"));
        areaRateRepository.delete(rate);
        activityRecorder.record("Shipping", "SHIPPING_AREA_DELETED", "Deleted area shipping rate for " + rate.getCity().getName(), "SUCCESS", buildContext(rate));
    }

    private void applyRequest(ShippingAreaRate rate, ShippingAreaRateRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Shipping rate payload is required");
        }
        Long countryId = request.getCountryId();
        Long stateId = request.getStateId();
        Long cityId = request.getCityId();
        if (countryId == null || stateId == null || cityId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Country, state, and city are required");
        }
        ShippingCountry country = countryRepository.findById(countryId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
        ShippingState state = stateRepository.findById(stateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
        if (!state.getCountry().getId().equals(country.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "State does not belong to the selected country");
        }
        ShippingCity city = cityRepository.findById(cityId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "City not found"));
        if (!city.getState().getId().equals(state.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "City does not belong to the selected state");
        }
        rate.setCountry(country);
        rate.setState(state);
        rate.setCity(city);
        BigDecimal cost = request.getCostValue();
        if (cost == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Shipping cost is required");
        }
        if (cost.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Shipping cost cannot be negative");
        }
        rate.setCostValue(cost.setScale(2, RoundingMode.HALF_UP));
        String notes = request.getNotes();
        rate.setNotes(StringUtils.hasText(notes) ? notes.trim() : null);
    }

    private void ensureUnique(ShippingAreaRate rate, Long rateId) {
        Long countryId = rate.getCountry() != null ? rate.getCountry().getId() : null;
        Long stateId = rate.getState() != null ? rate.getState().getId() : null;
        Long cityId = rate.getCity() != null ? rate.getCity().getId() : null;
        if (countryId == null || stateId == null || cityId == null) {
            return;
        }
        boolean exists = rateId == null
                ? areaRateRepository.existsByCountryIdAndStateIdAndCityId(countryId, stateId, cityId)
                : areaRateRepository.existsByCountryIdAndStateIdAndCityIdAndIdNot(countryId, stateId, cityId, rateId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "An area shipping rate already exists for the selected location");
        }
    }

    private ShippingAreaRateDto toDto(ShippingAreaRate rate) {
        ShippingAreaRateDto dto = new ShippingAreaRateDto();
        dto.setId(rate.getId());
        dto.setCountryId(rate.getCountry() != null ? rate.getCountry().getId() : null);
        dto.setCountryName(rate.getCountry() != null ? rate.getCountry().getName() : null);
        dto.setStateId(rate.getState() != null ? rate.getState().getId() : null);
        dto.setStateName(rate.getState() != null ? rate.getState().getName() : null);
        dto.setCityId(rate.getCity() != null ? rate.getCity().getId() : null);
        dto.setCityName(rate.getCity() != null ? rate.getCity().getName() : null);
        dto.setCostValue(rate.getCostValue());
        dto.setNotes(rate.getNotes());
        dto.setCreatedAt(rate.getCreatedAt());
        dto.setUpdatedAt(rate.getUpdatedAt());
        return dto;
    }

    private Map<String, Object> buildContext(ShippingAreaRate rate) {
        Map<String, Object> context = new HashMap<>();
        context.put("areaRateId", rate.getId());
        context.put("countryId", rate.getCountry() != null ? rate.getCountry().getId() : null);
        context.put("stateId", rate.getState() != null ? rate.getState().getId() : null);
        context.put("cityId", rate.getCity() != null ? rate.getCity().getId() : null);
        context.put("cost", rate.getCostValue());
        return context;
    }
}
