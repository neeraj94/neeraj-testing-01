package com.example.rbac.cart.controller;

import com.example.rbac.cart.dto.CartDto;
import com.example.rbac.cart.service.CartService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
}
