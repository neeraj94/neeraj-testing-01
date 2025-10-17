package com.example.rbac.checkout.controller;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.checkout.service.CheckoutService;
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
@RequestMapping("/api/v1/admin/users")
public class UserAddressAdminController {

    private final CheckoutService checkoutService;

    public UserAddressAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping("/{userId}/addresses")
    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'USER_VIEW_GLOBAL', 'USER_VIEW_OWN', 'ORDER_MANAGE')")
    public List<CheckoutAddressDto> listAddresses(@PathVariable Long userId) {
        return checkoutService.listAddressesForAdmin(userId);
    }

    @PostMapping("/{userId}/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('USER_UPDATE', 'USER_UPDATE_GLOBAL', 'ORDER_MANAGE')")
    public CheckoutAddressDto createAddress(@PathVariable Long userId,
                                            @RequestBody CheckoutAddressRequest request) {
        return checkoutService.createAddress(userId, request);
    }
}
