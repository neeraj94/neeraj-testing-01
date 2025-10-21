package com.example.rbac.admin.checkout.controller;

import com.example.rbac.client.checkout.service.CheckoutService;
import com.example.rbac.client.shipping.dto.ShippingOptionDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/checkout/regions")
public class CheckoutRegionAdminController {

    private static final String CHECKOUT_REGION_ACCESS =
            "hasAnyAuthority('CUSTOMER_MANAGE_CHECKOUT', 'USER_VIEW', 'USER_VIEW_GLOBAL', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE')";

    private final CheckoutService checkoutService;

    public CheckoutRegionAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping("/countries")
    @PreAuthorize(CHECKOUT_REGION_ACCESS)
    public List<ShippingOptionDto> listCountries() {
        return checkoutService.listEnabledCountries();
    }

    @GetMapping("/countries/{countryId}/states")
    @PreAuthorize(CHECKOUT_REGION_ACCESS)
    public List<ShippingOptionDto> listStates(@PathVariable Long countryId) {
        return checkoutService.listEnabledStates(countryId);
    }

    @GetMapping("/states/{stateId}/cities")
    @PreAuthorize(CHECKOUT_REGION_ACCESS)
    public List<ShippingOptionDto> listCities(@PathVariable Long stateId) {
        return checkoutService.listEnabledCities(stateId);
    }
}
