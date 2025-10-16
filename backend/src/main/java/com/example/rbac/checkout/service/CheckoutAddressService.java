package com.example.rbac.checkout.service;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.checkout.dto.CheckoutAddressType;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.shipping.model.ShippingCity;
import com.example.rbac.shipping.model.ShippingCountry;
import com.example.rbac.shipping.model.ShippingState;
import com.example.rbac.shipping.repository.ShippingCityRepository;
import com.example.rbac.shipping.repository.ShippingCountryRepository;
import com.example.rbac.shipping.repository.ShippingStateRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class CheckoutAddressService {

    private final ShippingCountryRepository countryRepository;
    private final ShippingStateRepository stateRepository;
    private final ShippingCityRepository cityRepository;
    private final AtomicLong addressSequence = new AtomicLong(1L);
    private final Map<Long, List<AddressRecord>> addressStore = new ConcurrentHashMap<>();

    public CheckoutAddressService(ShippingCountryRepository countryRepository,
                                  ShippingStateRepository stateRepository,
                                  ShippingCityRepository cityRepository) {
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
    }

    public List<CheckoutAddressDto> listAddresses(Long userId) {
        return addressStore.getOrDefault(userId, List.of()).stream()
                .sorted(Comparator.comparing(AddressRecord::createdAt))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public CheckoutAddressDto createAddress(Long userId, CheckoutAddressRequest request) {
        AddressRecord record = buildRecord(userId, request);
        List<AddressRecord> records = addressStore.computeIfAbsent(userId, key -> new ArrayList<>());
        if (Boolean.TRUE.equals(request.getMakeDefault())) {
            for (AddressRecord existing : records) {
                if (existing.type == record.type) {
                    existing.defaultAddress = false;
                }
            }
            record.defaultAddress = true;
        }
        records.add(record);
        records.sort(Comparator.comparing(AddressRecord::createdAt));
        return toDto(record);
    }

    public CheckoutAddressDto getAddress(Long userId, Long addressId) {
        return addressStore.getOrDefault(userId, List.of()).stream()
                .filter(record -> Objects.equals(record.id, addressId))
                .findFirst()
                .map(this::toDto)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));
    }

    public List<CheckoutAddressDto> listAddressesForAdmin(Long userId) {
        return listAddresses(userId);
    }

    private AddressRecord buildRecord(Long userId, CheckoutAddressRequest request) {
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User is required");
        }
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Address payload is required");
        }
        CheckoutAddressType type = Optional.ofNullable(request.getType())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Address type is required"));
        if (!StringUtils.hasText(request.getFullName())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Full name is required");
        }
        if (!StringUtils.hasText(request.getMobileNumber())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mobile number is required");
        }
        if (!StringUtils.hasText(request.getAddressLine1())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Address line 1 is required");
        }

        ShippingCountry country = null;
        if (request.getCountryId() != null) {
            country = countryRepository.findById(request.getCountryId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Country not found"));
        }
        ShippingState state = null;
        if (request.getStateId() != null) {
            state = stateRepository.findById(request.getStateId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "State not found"));
            if (country != null && state.getCountry() != null
                    && !Objects.equals(state.getCountry().getId(), country.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Selected state does not belong to the provided country");
            }
            if (country == null) {
                country = state.getCountry();
            }
        }
        ShippingCity city = null;
        if (request.getCityId() != null) {
            city = cityRepository.findById(request.getCityId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "City not found"));
            if (state != null && city.getState() != null
                    && !Objects.equals(city.getState().getId(), state.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Selected city does not belong to the provided state");
            }
            if (state == null) {
                state = city.getState();
            }
            if (country == null && state != null) {
                country = state.getCountry();
            }
        }

        Instant now = Instant.now();
        AddressRecord record = new AddressRecord();
        record.id = addressSequence.getAndIncrement();
        record.userId = userId;
        record.type = type;
        record.countryId = country != null ? country.getId() : null;
        record.countryName = country != null ? country.getName() : null;
        record.stateId = state != null ? state.getId() : null;
        record.stateName = state != null ? state.getName() : null;
        record.cityId = city != null ? city.getId() : null;
        record.cityName = city != null ? city.getName() : null;
        record.fullName = request.getFullName().trim();
        record.mobileNumber = request.getMobileNumber().trim();
        record.pinCode = Optional.ofNullable(request.getPinCode()).map(String::trim).orElse(null);
        record.addressLine1 = request.getAddressLine1().trim();
        record.addressLine2 = Optional.ofNullable(request.getAddressLine2()).map(String::trim).orElse(null);
        record.landmark = Optional.ofNullable(request.getLandmark()).map(String::trim).orElse(null);
        record.defaultAddress = false;
        record.createdAt = now;
        record.updatedAt = now;
        return record;
    }

    private CheckoutAddressDto toDto(AddressRecord record) {
        CheckoutAddressDto dto = new CheckoutAddressDto();
        dto.setId(record.id);
        dto.setType(record.type);
        dto.setCountryId(record.countryId);
        dto.setCountryName(record.countryName);
        dto.setStateId(record.stateId);
        dto.setStateName(record.stateName);
        dto.setCityId(record.cityId);
        dto.setCityName(record.cityName);
        dto.setFullName(record.fullName);
        dto.setMobileNumber(record.mobileNumber);
        dto.setPinCode(record.pinCode);
        dto.setAddressLine1(record.addressLine1);
        dto.setAddressLine2(record.addressLine2);
        dto.setLandmark(record.landmark);
        dto.setDefaultAddress(record.defaultAddress);
        dto.setCreatedAt(record.createdAt);
        dto.setUpdatedAt(record.updatedAt);
        return dto;
    }

    private static final class AddressRecord {
        private Long id;
        private Long userId;
        private CheckoutAddressType type;
        private Long countryId;
        private String countryName;
        private Long stateId;
        private String stateName;
        private Long cityId;
        private String cityName;
        private String fullName;
        private String mobileNumber;
        private String pinCode;
        private String addressLine1;
        private String addressLine2;
        private String landmark;
        private boolean defaultAddress;
        private Instant createdAt;
        private Instant updatedAt;

        private Instant createdAt() {
            return createdAt;
        }
    }
}
