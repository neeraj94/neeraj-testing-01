package com.example.rbac.cart.controller;

import com.example.rbac.cart.dto.AddCartItemRequest;
import com.example.rbac.cart.dto.CartDto;
import com.example.rbac.cart.dto.UpdateCartItemRequest;
import com.example.rbac.cart.service.CartService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/{userId}/cart")
public class UserCartController {

    private final CartService cartService;

    public UserCartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartDto getUserCart(@PathVariable("userId") Long userId) {
        return cartService.getCartForUser(userId);
    }

    @PostMapping("/items")
    public CartDto addItemToUserCart(@PathVariable("userId") Long userId,
                                     @Valid @RequestBody AddCartItemRequest request) {
        return cartService.addItemForUser(userId, request);
    }

    @PatchMapping("/items/{itemId}")
    public CartDto updateUserCartItem(@PathVariable("userId") Long userId,
                                      @PathVariable("itemId") Long itemId,
                                      @Valid @RequestBody UpdateCartItemRequest request) {
        return cartService.updateItemForUser(userId, itemId, request);
    }

    @DeleteMapping("/items/{itemId}")
    public CartDto removeUserCartItem(@PathVariable("userId") Long userId,
                                      @PathVariable("itemId") Long itemId) {
        return cartService.removeItemForUser(userId, itemId);
    }
}
