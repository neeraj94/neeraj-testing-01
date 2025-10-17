package com.example.rbac.checkout.controller;

import com.example.rbac.checkout.dto.OrderDetailDto;
import com.example.rbac.checkout.dto.OrderListItemDto;
import com.example.rbac.checkout.dto.OrderSearchCriteria;
import com.example.rbac.checkout.service.CheckoutService;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class OrderAdminController {

    private final CheckoutService checkoutService;

    public OrderAdminController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ORDER_MANAGE', 'CHECKOUT_MANAGE')")
    public PageResponse<OrderListItemDto> listOrders(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "payment", required = false) String payment,
            @RequestParam(name = "from", required = false) String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(name = "sort", required = false) String sort,
            @RequestParam(name = "direction", required = false) String direction,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        OrderSearchCriteria criteria = new OrderSearchCriteria();
        criteria.setSearch(search);
        criteria.setStatus(status);
        criteria.setPaymentMethod(payment);
        criteria.setPlacedFrom(parseInstant(from));
        criteria.setPlacedTo(parseInstant(to));
        criteria.setSort(sort);
        criteria.setDirection(direction);
        criteria.setPage(page);
        criteria.setSize(size);
        return checkoutService.listOrders(criteria);
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAnyAuthority('ORDER_MANAGE', 'CHECKOUT_MANAGE')")
    public OrderDetailDto getOrder(@PathVariable Long orderId) {
        return checkoutService.getOrderDetail(orderId);
    }

    private java.time.Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return java.time.Instant.parse(value);
        } catch (java.time.format.DateTimeParseException ex) {
            return null;
        }
    }
}
