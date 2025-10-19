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
@RequestMapping("/api/v1/admin/users/{userId}/orders")
public class UserOrderAdminController {

    private final CheckoutService checkoutService;

    public UserOrderAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL')")
    public List<OrderListItemDto> listOrders(@PathVariable Long userId) {
        return checkoutService.listOrdersForUser(userId);
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL')")
    public OrderDetailDto getOrder(@PathVariable Long userId, @PathVariable Long orderId) {
        return checkoutService.getOrderDetailForUser(userId, orderId);
    }
}
