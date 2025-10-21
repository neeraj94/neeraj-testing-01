package com.example.rbac.client.checkout.controller;

import com.example.rbac.client.checkout.dto.CheckoutAddressDto;
import com.example.rbac.client.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.client.checkout.dto.CheckoutOrderRequest;
import com.example.rbac.client.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.client.checkout.dto.CheckoutSummaryDto;
import com.example.rbac.client.checkout.dto.OrderDetailDto;
import com.example.rbac.client.checkout.dto.OrderSummaryDto;
import com.example.rbac.client.checkout.dto.PaymentMethodDto;
import com.example.rbac.client.checkout.service.CheckoutService;
import com.example.rbac.client.shipping.dto.ShippingOptionDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/client/checkout", "/checkout"})
public class CheckoutController {

    private static final String CHECKOUT_REGION_ACCESS =
            "hasAnyAuthority('CUSTOMER_MANAGE_CHECKOUT', 'USER_VIEW', 'USER_VIEW_GLOBAL', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE')";

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping("/addresses")
    @PreAuthorize("hasAuthority('CUSTOMER_MANAGE_ADDRESSES')")
    public List<CheckoutAddressDto> listAddresses() {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.listAddresses(userId);
    }

    @PostMapping("/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('CUSTOMER_MANAGE_ADDRESSES')")
    public CheckoutAddressDto createAddress(@RequestBody CheckoutAddressRequest request) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.createAddress(userId, request);
    }

    @PutMapping("/addresses/{id}")
    @PreAuthorize("hasAuthority('CUSTOMER_MANAGE_ADDRESSES')")
    public CheckoutAddressDto updateAddress(@PathVariable("id") Long addressId,
                                            @RequestBody CheckoutAddressRequest request) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.updateAddress(userId, addressId, request);
    }

    @GetMapping("/payment-methods")
    @PreAuthorize("hasAuthority('CUSTOMER_MANAGE_CHECKOUT')")
    public List<PaymentMethodDto> listPaymentMethods() {
        return checkoutService.listPaymentMethodsForCustomer();
    }

    @GetMapping("/regions/countries")
    @PreAuthorize(CHECKOUT_REGION_ACCESS)
    public List<ShippingOptionDto> listCountriesForCheckout() {
        return checkoutService.listEnabledCountries();
    }

    @GetMapping("/regions/countries/{countryId}/states")
    @PreAuthorize(CHECKOUT_REGION_ACCESS)
    public List<ShippingOptionDto> listStatesForCheckout(@PathVariable Long countryId) {
        return checkoutService.listEnabledStates(countryId);
    }

    @GetMapping("/regions/states/{stateId}/cities")
    @PreAuthorize(CHECKOUT_REGION_ACCESS)
    public List<ShippingOptionDto> listCitiesForCheckout(@PathVariable Long stateId) {
        return checkoutService.listEnabledCities(stateId);
    }

    @PostMapping("/summary")
    @PreAuthorize("hasAuthority('CUSTOMER_MANAGE_CHECKOUT')")
    public OrderSummaryDto previewOrder(@RequestBody CheckoutOrderRequest request) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.buildSummary(userId, request).getOrderSummary();
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('CUSTOMER_PLACE_ORDER')")
    public CheckoutOrderResponse placeOrder(@RequestBody CheckoutOrderRequest request) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.placeOrder(userId, request);
    }

    @GetMapping("/orders/{orderId}")
    @PreAuthorize("hasAuthority('CUSTOMER_VIEW_ORDER_HISTORY')")
    public OrderDetailDto getOrder(@PathVariable Long orderId) {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.getOrderDetailForUser(userId, orderId);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('CUSTOMER_MANAGE_CHECKOUT')")
    public CheckoutSummaryDto fullSummary() {
        Long userId = checkoutService.resolveCurrentUserId();
        return checkoutService.buildSummary(userId, new CheckoutOrderRequest());
    }
}
