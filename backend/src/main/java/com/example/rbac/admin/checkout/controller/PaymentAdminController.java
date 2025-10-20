package com.example.rbac.admin.checkout.controller;

import com.example.rbac.admin.checkout.dto.PaymentMethodDto;
import com.example.rbac.admin.checkout.dto.PaymentMethodSettingsRequest;
import com.example.rbac.admin.checkout.service.CheckoutService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/payments")
public class PaymentAdminController {

    private final CheckoutService checkoutService;

    public PaymentAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping("/methods")
    @PreAuthorize("hasAnyAuthority('PAYMENT_VIEW', 'PAYMENT_MANAGE')")
    public List<PaymentMethodDto> listPaymentMethods() {
        return checkoutService.listPaymentMethodsForAdmin();
    }

    @PutMapping("/methods/{key}")
    @PreAuthorize("hasAuthority('PAYMENT_MANAGE')")
    public PaymentMethodDto updatePaymentMethod(@PathVariable String key,
                                                @RequestBody PaymentMethodSettingsRequest request) {
        return checkoutService.updatePaymentMethod(key, request);
    }
}
