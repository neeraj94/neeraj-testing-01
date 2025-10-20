package com.example.rbac.admin.checkout.controller;

import com.example.rbac.client.checkout.dto.OrderDetailDto;
import com.example.rbac.client.checkout.dto.OrderListItemDto;
import com.example.rbac.client.checkout.service.CheckoutService;
import com.example.rbac.admin.users.model.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/orders")
public class OrderAdminController {

    private final CheckoutService checkoutService;

    public OrderAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL')")
    public List<OrderListItemDto> listOrders(@AuthenticationPrincipal UserPrincipal principal) {
        return checkoutService.listOrdersForAdmin(principal);
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL')")
    public OrderDetailDto getOrder(@PathVariable Long orderId,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        return checkoutService.getOrderDetailForAdmin(orderId, principal);
    }
}
