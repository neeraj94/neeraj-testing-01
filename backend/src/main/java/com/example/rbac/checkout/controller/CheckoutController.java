package com.example.rbac.checkout.controller;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.checkout.dto.CheckoutOrderRequest;
import com.example.rbac.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.checkout.dto.CheckoutSummaryDto;
import com.example.rbac.checkout.dto.OrderDetailDto;
import com.example.rbac.checkout.dto.OrderSummaryDto;
import com.example.rbac.checkout.dto.PaymentMethodDto;
import com.example.rbac.checkout.service.CheckoutService;
import com.example.rbac.shipping.dto.ShippingOptionDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping("/addresses")
    @PreAuthorize("isAuthenticated()")
    public List<CheckoutAddressDto> listAddresses() {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.listAddresses(userId);
    }

    @PostMapping("/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public CheckoutAddressDto createAddress(@RequestBody CheckoutAddressRequest request) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.createAddress(userId, request);
    }

    @GetMapping("/payment-methods")
    @PreAuthorize("isAuthenticated()")
    public List<PaymentMethodDto> listPaymentMethods() {
        return checkoutService.listPaymentMethodsForCustomer();
    }

    @GetMapping("/regions/countries")
    @PreAuthorize("isAuthenticated()")
    public List<ShippingOptionDto> listCountriesForCheckout() {
        return checkoutService.listEnabledCountries();
    }

    @GetMapping("/regions/countries/{countryId}/states")
    @PreAuthorize("isAuthenticated()")
    public List<ShippingOptionDto> listStatesForCheckout(@PathVariable Long countryId) {
        return checkoutService.listEnabledStates(countryId);
    }

    @GetMapping("/regions/states/{stateId}/cities")
    @PreAuthorize("isAuthenticated()")
    public List<ShippingOptionDto> listCitiesForCheckout(@PathVariable Long stateId) {
        return checkoutService.listEnabledCities(stateId);
    }

    @PostMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public OrderSummaryDto previewOrder(@RequestBody CheckoutOrderRequest request) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.buildSummary(userId, request).getOrderSummary();
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public CheckoutOrderResponse placeOrder(@RequestBody CheckoutOrderRequest request) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.placeOrder(userId, request);
    }

    @GetMapping("/orders/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public OrderDetailDto getOrder(@PathVariable Long orderId) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.getOrderDetailForUser(userId, orderId);
    }

    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public CheckoutSummaryDto fullSummary() {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.buildSummary(userId, new CheckoutOrderRequest());
    }
}
