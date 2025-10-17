package com.example.rbac.cart.controller;

import com.example.rbac.cart.dto.AddCartItemRequest;
import com.example.rbac.cart.dto.CartAdminListItemDto;
import com.example.rbac.cart.dto.CartDto;
import com.example.rbac.cart.dto.UpdateCartItemRequest;
import com.example.rbac.cart.service.CartService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PatchMapping;

@RestController
@RequestMapping("/api/v1/admin/carts")
public class CartAdminController {

    private final CartService cartService;

    public CartAdminController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ORDER_MANAGE', 'CHECKOUT_MANAGE', 'USER_VIEW', 'USER_VIEW_GLOBAL')")
    public PageResponse<CartAdminListItemDto> listCarts(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return cartService.listCarts(search, page, size);
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN','ORDER_MANAGE','CHECKOUT_MANAGE')")
    public CartDto getCart(@PathVariable Long userId) {
        return cartService.getCartForUser(userId);
    }

    @PostMapping("/{userId}")
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto createCart(@PathVariable Long userId) {
        return cartService.createCartForUser(userId);
    }

    @PostMapping("/{userId}/items")
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto addCartItem(@PathVariable Long userId, @Valid @RequestBody AddCartItemRequest request) {
        return cartService.addItemForUser(userId, request);
    }

    @PatchMapping("/{userId}/items/{itemId}")
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto updateCartItem(@PathVariable Long userId,
                                  @PathVariable Long itemId,
                                  @Valid @RequestBody UpdateCartItemRequest request) {
        return cartService.updateItemForUser(userId, itemId, request);
    }

    @DeleteMapping("/{userId}/items/{itemId}")
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto removeCartItem(@PathVariable Long userId, @PathVariable Long itemId) {
        return cartService.removeItemForUser(userId, itemId);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto clearCart(@PathVariable Long userId) {
        return cartService.clearCartForUser(userId);
    }
}
