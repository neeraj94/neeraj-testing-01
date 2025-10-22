package com.example.rbac.admin.checkout.controller;

import com.example.rbac.admin.checkout.dto.AdminOrderCouponOption;
import com.example.rbac.admin.checkout.dto.AdminOrderCustomerOption;
import com.example.rbac.admin.checkout.dto.AdminOrderPreviewRequest;
import com.example.rbac.admin.checkout.dto.AdminOrderPreviewResponse;
import com.example.rbac.admin.checkout.dto.AdminOrderProductOption;
import com.example.rbac.admin.checkout.dto.AdminOrderProductSearchResult;
import com.example.rbac.admin.checkout.dto.AdminOrderRequest;
import com.example.rbac.admin.checkout.service.OrderAdminService;
import com.example.rbac.client.checkout.dto.OrderDetailDto;
import com.example.rbac.client.checkout.dto.OrderListItemDto;
import com.example.rbac.client.checkout.service.CheckoutService;
import com.example.rbac.admin.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/orders")
public class OrderAdminController {

    private final CheckoutService checkoutService;
    private final OrderAdminService orderAdminService;

    public OrderAdminController(CheckoutService checkoutService,
                               OrderAdminService orderAdminService) {
        this.checkoutService = checkoutService;
        this.orderAdminService = orderAdminService;
    }

    @GetMapping
    @PreAuthorize("@orderPermissionEvaluator.canViewOrders()")
    public List<OrderListItemDto> listOrders(@AuthenticationPrincipal UserPrincipal principal) {
        return checkoutService.listOrdersForAdmin(principal);
    }

    @GetMapping("/customers")
    @PreAuthorize("@orderPermissionEvaluator.canCreateOrders() || @orderPermissionEvaluator.canUpdateOrders()")
    public List<AdminOrderCustomerOption> searchCustomers(@RequestParam(name = "search", required = false) String search,
                                                          @RequestParam(name = "size", defaultValue = "25") int size) {
        return orderAdminService.searchCustomers(search, size);
    }

    @GetMapping("/catalog")
    @PreAuthorize("@orderPermissionEvaluator.canCreateOrders() || @orderPermissionEvaluator.canUpdateOrders()")
    public List<AdminOrderProductSearchResult> searchProducts(@RequestParam(name = "search", required = false) String search,
                                                              @RequestParam(name = "size", defaultValue = "20") int size) {
        return orderAdminService.searchProducts(search, size);
    }

    @GetMapping("/catalog/{productId}")
    @PreAuthorize("@orderPermissionEvaluator.canCreateOrders() || @orderPermissionEvaluator.canUpdateOrders()")
    public AdminOrderProductOption getProductOption(@PathVariable Long productId) {
        return orderAdminService.getProductOption(productId);
    }

    @GetMapping("/coupons/active")
    @PreAuthorize("@orderPermissionEvaluator.canCreateOrders() || @orderPermissionEvaluator.canUpdateOrders()")
    public List<AdminOrderCouponOption> listActiveCoupons(@RequestParam(name = "size", defaultValue = "50") int size) {
        return orderAdminService.listActiveCoupons(size);
    }

    @PostMapping("/preview")
    @PreAuthorize("@orderPermissionEvaluator.canCreateOrders() || @orderPermissionEvaluator.canUpdateOrders()")
    public AdminOrderPreviewResponse previewOrder(@Valid @RequestBody AdminOrderPreviewRequest request) {
        return orderAdminService.previewOrder(request);
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("@orderPermissionEvaluator.canViewOrders()")
    public OrderDetailDto getOrder(@PathVariable Long orderId,
                                   @AuthenticationPrincipal UserPrincipal principal) {
        return checkoutService.getOrderDetailForAdmin(orderId, principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@orderPermissionEvaluator.canCreateOrders()")
    public OrderDetailDto createOrder(@Valid @RequestBody AdminOrderRequest request) {
        return orderAdminService.createOrder(request);
    }

    @PutMapping("/{orderId}")
    @PreAuthorize("@orderPermissionEvaluator.canUpdateOrders()")
    public OrderDetailDto updateOrder(@PathVariable Long orderId,
                                      @Valid @RequestBody AdminOrderRequest request) {
        return orderAdminService.updateOrder(orderId, request);
    }

    @DeleteMapping("/{orderId}")
    @PreAuthorize("@orderPermissionEvaluator.canDeleteOrders()")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrder(@PathVariable Long orderId) {
        orderAdminService.deleteOrder(orderId);
    }
}
