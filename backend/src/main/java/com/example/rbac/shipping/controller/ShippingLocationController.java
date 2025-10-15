package com.example.rbac.shipping.controller;

import com.example.rbac.shipping.dto.*;
import com.example.rbac.shipping.service.ShippingLocationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shipping")
public class ShippingLocationController {

    private final ShippingLocationService shippingLocationService;

    public ShippingLocationController(ShippingLocationService shippingLocationService) {
        this.shippingLocationService = shippingLocationService;
    }

    @GetMapping("/countries")
    @PreAuthorize("hasAnyAuthority('SHIPPING_AREA_VIEW', 'SHIPPING_LOCATION_MANAGE')")
    public List<ShippingCountryDto> listCountries() {
        return shippingLocationService.listCountries();
    }

    @GetMapping("/countries/options")
    @PreAuthorize("hasAnyAuthority('SHIPPING_AREA_VIEW', 'SHIPPING_LOCATION_MANAGE')")
    public List<ShippingOptionDto> countryOptions() {
        return shippingLocationService.countryOptions();
    }

    @PostMapping("/countries")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingCountryDto createCountry(@RequestBody ShippingCountryRequest request) {
        return shippingLocationService.createCountry(request);
    }

    @PutMapping("/countries/{id}")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingCountryDto updateCountry(@PathVariable Long id, @RequestBody ShippingCountryRequest request) {
        return shippingLocationService.updateCountry(id, request);
    }

    @PutMapping("/countries/{id}/settings")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingCountryDto updateCountrySettings(@PathVariable Long id,
                                                    @RequestBody ShippingCountrySettingsRequest request) {
        return shippingLocationService.updateCountrySettings(id, request);
    }

    @PutMapping("/countries/bulk-settings")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public List<ShippingCountryDto> bulkUpdateCountrySettings(@RequestBody ShippingCountryBulkSettingsRequest request) {
        return shippingLocationService.bulkUpdateCountrySettings(request);
    }

    @DeleteMapping("/countries/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public void deleteCountry(@PathVariable Long id) {
        shippingLocationService.deleteCountry(id);
    }

    @GetMapping("/countries/{countryId}/states")
    @PreAuthorize("hasAnyAuthority('SHIPPING_AREA_VIEW', 'SHIPPING_LOCATION_MANAGE')")
    public List<ShippingStateDto> listStates(@PathVariable Long countryId) {
        return shippingLocationService.listStates(countryId);
    }

    @GetMapping("/countries/{countryId}/states/options")
    @PreAuthorize("hasAnyAuthority('SHIPPING_AREA_VIEW', 'SHIPPING_LOCATION_MANAGE')")
    public List<ShippingOptionDto> stateOptions(@PathVariable Long countryId) {
        return shippingLocationService.stateOptions(countryId);
    }

    @PostMapping("/countries/{countryId}/states")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingStateDto createState(@PathVariable Long countryId, @RequestBody ShippingStateRequest request) {
        request.setCountryId(countryId);
        return shippingLocationService.createState(request);
    }

    @PutMapping("/states/{id}")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingStateDto updateState(@PathVariable Long id, @RequestBody ShippingStateRequest request) {
        return shippingLocationService.updateState(id, request);
    }

    @PutMapping("/states/{id}/settings")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingStateDto updateStateSettings(@PathVariable Long id,
                                                @RequestBody ShippingStateSettingsRequest request) {
        return shippingLocationService.updateStateSettings(id, request);
    }

    @PutMapping("/states/bulk-settings")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public List<ShippingStateDto> bulkUpdateStateSettings(@RequestBody ShippingStateBulkSettingsRequest request) {
        return shippingLocationService.bulkUpdateStateSettings(request);
    }

    @DeleteMapping("/states/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public void deleteState(@PathVariable Long id) {
        shippingLocationService.deleteState(id);
    }

    @GetMapping("/states/{stateId}/cities")
    @PreAuthorize("hasAnyAuthority('SHIPPING_AREA_VIEW', 'SHIPPING_LOCATION_MANAGE')")
    public List<ShippingCityDto> listCities(@PathVariable Long stateId) {
        return shippingLocationService.listCities(stateId);
    }

    @GetMapping("/states/{stateId}/cities/options")
    @PreAuthorize("hasAnyAuthority('SHIPPING_AREA_VIEW', 'SHIPPING_LOCATION_MANAGE')")
    public List<ShippingOptionDto> cityOptions(@PathVariable Long stateId) {
        return shippingLocationService.cityOptions(stateId);
    }

    @PostMapping("/states/{stateId}/cities")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingCityDto createCity(@PathVariable Long stateId, @RequestBody ShippingCityRequest request) {
        request.setStateId(stateId);
        return shippingLocationService.createCity(request);
    }

    @PutMapping("/cities/{id}")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingCityDto updateCity(@PathVariable Long id, @RequestBody ShippingCityRequest request) {
        return shippingLocationService.updateCity(id, request);
    }

    @PutMapping("/cities/{id}/settings")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public ShippingCityDto updateCitySettings(@PathVariable Long id,
                                              @RequestBody ShippingCitySettingsRequest request) {
        return shippingLocationService.updateCitySettings(id, request);
    }

    @PutMapping("/cities/bulk-settings")
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public List<ShippingCityDto> bulkUpdateCitySettings(@RequestBody ShippingCityBulkSettingsRequest request) {
        return shippingLocationService.bulkUpdateCitySettings(request);
    }

    @DeleteMapping("/cities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SHIPPING_LOCATION_MANAGE')")
    public void deleteCity(@PathVariable Long id) {
        shippingLocationService.deleteCity(id);
    }
}
