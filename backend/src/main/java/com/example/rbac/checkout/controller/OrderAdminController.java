package com.example.rbac.checkout.controller;

import com.example.rbac.checkout.dto.OrderDetailDto;
import com.example.rbac.checkout.dto.OrderListItemDto;
import com.example.rbac.checkout.service.CheckoutService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class OrderAdminController {

    private final CheckoutService checkoutService;

    public OrderAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ORDER_MANAGE', 'CHECKOUT_MANAGE')")
    public List<OrderListItemDto> listOrders() {
        return checkoutService.listOrders();
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAnyAuthority('ORDER_MANAGE', 'CHECKOUT_MANAGE')")
    public OrderDetailDto getOrder(@PathVariable Long orderId) {
        return checkoutService.getOrderDetail(orderId);
    }
}
