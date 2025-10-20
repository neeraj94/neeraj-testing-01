package com.example.rbac.admin.cart.controller;

import com.example.rbac.cart.dto.AdminCartSummaryDto;
import com.example.rbac.cart.service.CartService;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/carts")
public class AdminCartController {

    private final CartService cartService;

    public AdminCartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN')")
    public PageResponse<AdminCartSummaryDto> listCarts(@RequestParam(name = "page", defaultValue = "0") int page,
                                                       @RequestParam(name = "size", defaultValue = "20") int size,
                                                       @RequestParam(name = "search", required = false) String search,
                                                       @RequestParam(name = "sort", required = false) String sort,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return cartService.listAdminCarts(page, size, search, sort, principal);
    }
}
