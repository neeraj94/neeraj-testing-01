package com.example.rbac.admin.cart.controller;

import com.example.rbac.cart.dto.AddCartItemRequest;
import com.example.rbac.cart.dto.CartDto;
import com.example.rbac.cart.dto.UpdateCartItemRequest;
import com.example.rbac.cart.service.CartService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/{userId}/cart")
public class UserCartController {

    private final CartService cartService;

    public UserCartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL')")
    public CartDto getUserCart(@PathVariable("userId") Long userId) {
        return cartService.getCartForUser(userId);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_CREATE')")
    public CartDto createUserCart(@PathVariable("userId") Long userId) {
        return cartService.createCartForUser(userId);
    }

    @PostMapping("/items")
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and (hasAuthority('USER_CREATE') or hasAuthority('USER_UPDATE'))")
    public CartDto addItemToUserCart(@PathVariable("userId") Long userId,
                                     @Valid @RequestBody AddCartItemRequest request) {
        return cartService.addItemForUser(userId, request);
    }

    @PatchMapping("/items/{itemId}")
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_UPDATE')")
    public CartDto updateUserCartItem(@PathVariable("userId") Long userId,
                                      @PathVariable("itemId") Long itemId,
                                      @Valid @RequestBody UpdateCartItemRequest request) {
        return cartService.updateItemForUser(userId, itemId, request);
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_DELETE')")
    public CartDto removeUserCartItem(@PathVariable("userId") Long userId,
                                      @PathVariable("itemId") Long itemId) {
        return cartService.removeItemForUser(userId, itemId);
    }

    @DeleteMapping
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_DELETE')")
    public CartDto clearUserCart(@PathVariable("userId") Long userId) {
        return cartService.clearCartForUser(userId);
    }
}
