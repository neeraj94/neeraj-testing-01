package com.example.rbac.client.cart.controller;

import com.example.rbac.client.cart.dto.AddCartItemRequest;
import com.example.rbac.client.cart.dto.CartDto;
import com.example.rbac.client.cart.dto.MergeCartRequest;
import com.example.rbac.client.cart.dto.UpdateCartItemRequest;
import com.example.rbac.client.cart.service.CartService;
import com.example.rbac.admin.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartDto getCart(@AuthenticationPrincipal UserPrincipal principal) {
        return cartService.getCurrentCart(principal);
    }

    @PostMapping("/items")
    public CartDto addItem(@Valid @RequestBody AddCartItemRequest request,
                           @AuthenticationPrincipal UserPrincipal principal) {
        return cartService.addItem(request, principal);
    }

    @PutMapping("/items/{itemId}")
    public CartDto updateItem(@PathVariable("itemId") Long itemId,
                              @Valid @RequestBody UpdateCartItemRequest request,
                              @AuthenticationPrincipal UserPrincipal principal) {
        return cartService.updateItem(itemId, request, principal);
    }

    @DeleteMapping("/items/{itemId}")
    public CartDto removeItem(@PathVariable("itemId") Long itemId,
                              @AuthenticationPrincipal UserPrincipal principal) {
        return cartService.removeItem(itemId, principal);
    }

    @DeleteMapping
    public CartDto clearCart(@AuthenticationPrincipal UserPrincipal principal) {
        return cartService.clearCart(principal);
    }

    @PostMapping("/merge")
    public CartDto merge(@Valid @RequestBody MergeCartRequest request,
                         @AuthenticationPrincipal UserPrincipal principal) {
        return cartService.mergeGuestCart(request, principal);
    }
}
