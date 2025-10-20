package com.example.rbac.admin.checkout.controller;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.checkout.service.CheckoutService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/users")
public class UserAddressAdminController {

    private final CheckoutService checkoutService;

    public UserAddressAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping("/{userId}/addresses")
    @PreAuthorize("@userPermissionEvaluator.canViewUser(#userId)")
    public List<CheckoutAddressDto> listAddresses(@PathVariable Long userId) {
        return checkoutService.listAddressesForAdmin(userId);
    }

    @PostMapping("/{userId}/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@userPermissionEvaluator.canCreateUserRecords(#userId)")
    public CheckoutAddressDto createAddress(@PathVariable Long userId,
                                            @RequestBody CheckoutAddressRequest request) {
        return checkoutService.createAddress(userId, request);
    }

    @PutMapping("/{userId}/addresses/{addressId}")
    @PreAuthorize("@userPermissionEvaluator.canUpdateUserRecords(#userId)")
    public CheckoutAddressDto updateAddress(@PathVariable Long userId,
                                            @PathVariable Long addressId,
                                            @RequestBody CheckoutAddressRequest request) {
        return checkoutService.updateAddressAsAdmin(userId, addressId, request);
    }

    @DeleteMapping("/{userId}/addresses/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@userPermissionEvaluator.canDeleteUserRecords(#userId)")
    public void deleteAddress(@PathVariable Long userId, @PathVariable Long addressId) {
        checkoutService.deleteAddressAsAdmin(userId, addressId);
    }
}
