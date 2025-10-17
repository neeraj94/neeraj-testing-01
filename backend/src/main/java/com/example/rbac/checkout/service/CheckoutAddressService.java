package com.example.rbac.checkout.service;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.checkout.dto.CheckoutAddressType;
import com.example.rbac.checkout.model.CheckoutAddress;
import com.example.rbac.checkout.repository.CheckoutAddressRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.shipping.model.ShippingCity;
import com.example.rbac.shipping.model.ShippingCountry;
import com.example.rbac.shipping.model.ShippingState;
import com.example.rbac.shipping.repository.ShippingCityRepository;
import com.example.rbac.shipping.repository.ShippingCountryRepository;
import com.example.rbac.shipping.repository.ShippingStateRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CheckoutAddressService {

    private final CheckoutAddressRepository addressRepository;
    private final ShippingCountryRepository countryRepository;
    private final ShippingStateRepository stateRepository;
    private final ShippingCityRepository cityRepository;
    private final UserRepository userRepository;

    public CheckoutAddressService(CheckoutAddressRepository addressRepository,
                                  ShippingCountryRepository countryRepository,
                                  ShippingStateRepository stateRepository,
                                  ShippingCityRepository cityRepository,
                                  UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CheckoutAddressDto> listAddresses(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return addressRepository.findByUserIdOrderByDefaultAddressDescCreatedAtAsc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CheckoutAddressDto createAddress(Long userId, CheckoutAddressRequest request) {
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User is required");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        CheckoutAddress address = new CheckoutAddress();
        address.setUser(user);
        applyRequest(address, request);
        boolean makeDefault = Boolean.TRUE.equals(request.getMakeDefault());
        if (makeDefault) {
            addressRepository.clearDefaultForType(userId, address.getType(), null);
            address.setDefaultAddress(true);
        } else if (!addressRepository.existsByUserIdAndTypeAndDefaultAddressTrue(userId, address.getType())) {
            address.setDefaultAddress(true);
        } else {
            address.setDefaultAddress(false);
        }
        CheckoutAddress saved = addressRepository.save(address);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public CheckoutAddressDto getAddress(Long userId, Long addressId) {
        if (userId == null || addressId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Address not found");
        }
        CheckoutAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));
        return toDto(address);
    }

    @Transactional
    public CheckoutAddressDto updateAddress(Long userId, Long addressId, CheckoutAddressRequest request) {
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User is required");
        }
        CheckoutAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));

        CheckoutAddressType previousType = address.getType();

        applyRequest(address, request);

        if (Boolean.TRUE.equals(request.getMakeDefault())) {
            addressRepository.clearDefaultForType(userId, address.getType(), address.getId());
            address.setDefaultAddress(true);
        } else if (Boolean.FALSE.equals(request.getMakeDefault())) {
            address.setDefaultAddress(false);
        } else if (!addressRepository.existsByUserIdAndTypeAndDefaultAddressTrue(userId, address.getType())) {
            address.setDefaultAddress(true);
        }

        CheckoutAddress saved = addressRepository.save(address);

        if (!saved.isDefaultAddress()) {
            ensureDefaultExists(userId, saved.getType());
        }
        if (!Objects.equals(previousType, saved.getType())) {
            ensureDefaultExists(userId, previousType);
        }

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<CheckoutAddressDto> listAddressesForAdmin(Long userId) {
        return listAddresses(userId);
    }

    @Transactional
    public CheckoutAddressDto updateAddressAsAdmin(Long userId, Long addressId, CheckoutAddressRequest request) {
        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User is required");
        }
        CheckoutAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Address not found"));
        if (address.getUser() == null || !Objects.equals(address.getUser().getId(), userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Address not found");
        }
        return updateAddress(userId, addressId, request);
    }

    private void ensureDefaultExists(Long userId, CheckoutAddressType type) {
        if (userId == null || type == null) {
            return;
        }
        if (addressRepository.existsByUserIdAndTypeAndDefaultAddressTrue(userId, type)) {
            return;
        }
        List<CheckoutAddress> addresses = addressRepository.findByUserIdOrderByDefaultAddressDescCreatedAtAsc(userId).stream()
                .filter(address -> type == address.getType())
                .collect(Collectors.toList());
        if (!CollectionUtils.isEmpty(addresses)) {
            CheckoutAddress fallback = addresses.get(0);
            fallback.setDefaultAddress(true);
            addressRepository.save(fallback);
        }
    }

    private void applyRequest(CheckoutAddress address, CheckoutAddressRequest request) {
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

        address.setType(type);
        address.setCountry(country);
        address.setState(state);
        address.setCity(city);
        address.setFullName(request.getFullName().trim());
        address.setMobileNumber(request.getMobileNumber().trim());
        address.setPinCode(Optional.ofNullable(request.getPinCode()).map(String::trim).orElse(null));
        address.setAddressLine1(request.getAddressLine1().trim());
        address.setAddressLine2(Optional.ofNullable(request.getAddressLine2()).map(String::trim).orElse(null));
        address.setLandmark(Optional.ofNullable(request.getLandmark()).map(String::trim).orElse(null));
    }

    private CheckoutAddressDto toDto(CheckoutAddress address) {
        CheckoutAddressDto dto = new CheckoutAddressDto();
        dto.setId(address.getId());
        dto.setType(address.getType());
        dto.setCountryId(address.getCountry() != null ? address.getCountry().getId() : null);
        dto.setCountryName(address.getCountry() != null ? address.getCountry().getName() : null);
        dto.setStateId(address.getState() != null ? address.getState().getId() : null);
        dto.setStateName(address.getState() != null ? address.getState().getName() : null);
        dto.setCityId(address.getCity() != null ? address.getCity().getId() : null);
        dto.setCityName(address.getCity() != null ? address.getCity().getName() : null);
        dto.setFullName(address.getFullName());
        dto.setMobileNumber(address.getMobileNumber());
        dto.setPinCode(address.getPinCode());
        dto.setAddressLine1(address.getAddressLine1());
        dto.setAddressLine2(address.getAddressLine2());
        dto.setLandmark(address.getLandmark());
        dto.setDefaultAddress(address.isDefaultAddress());
        dto.setCreatedAt(address.getCreatedAt());
        dto.setUpdatedAt(address.getUpdatedAt());
        return dto;
    }
}
