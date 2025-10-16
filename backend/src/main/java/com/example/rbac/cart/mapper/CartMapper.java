package com.example.rbac.cart.mapper;

import com.example.rbac.cart.dto.CartDto;
import com.example.rbac.cart.dto.CartItemDto;
import com.example.rbac.cart.model.Cart;
import com.example.rbac.cart.model.CartItem;
import com.example.rbac.products.model.MediaAsset;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductVariant;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Component
public class CartMapper {

    public CartDto toDto(Cart cart) {
        CartDto dto = new CartDto();
        dto.setId(cart.getId());
        dto.setUpdatedAt(cart.getUpdatedAt());
        List<CartItemDto> items = new ArrayList<>();
        int totalQuantity = 0;
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItem item : cart.getItems()) {
            CartItemDto itemDto = toItemDto(item);
            items.add(itemDto);
            if (itemDto.getQuantity() != null) {
                totalQuantity += itemDto.getQuantity();
            }
            if (itemDto.getLineTotal() != null) {
                subtotal = subtotal.add(itemDto.getLineTotal());
            }
        }
        dto.setItems(items);
        dto.setTotalQuantity(totalQuantity);
        dto.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        return dto;
    }

    public CartItemDto toItemDto(CartItem item) {
        CartItemDto dto = new CartItemDto();
        dto.setId(item.getId());
        dto.setQuantity(item.getQuantity());
        dto.setVariantLabel(item.getVariantLabel());
        dto.setVariantId(item.getVariant() != null ? item.getVariant().getId() : null);
        dto.setUnitPrice(item.getUnitPrice());
        if (item.getUnitPrice() != null && item.getQuantity() != null) {
            dto.setLineTotal(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP));
        }
        Product product = item.getProduct();
        if (product != null) {
            dto.setProductId(product.getId());
            dto.setProductName(product.getName());
            dto.setProductSlug(product.getSlug());
            dto.setSku(resolveSku(item));
            dto.setAvailableQuantity(resolveAvailableQuantity(item));
            dto.setInStock(resolveInStock(item));
            MediaAsset thumbnail = product.getThumbnail();
            dto.setThumbnailUrl(thumbnail != null ? thumbnail.getUrl() : null);
        }
        return dto;
    }

    private String resolveSku(CartItem item) {
        ProductVariant variant = item.getVariant();
        if (variant != null && variant.getSku() != null && !variant.getSku().isBlank()) {
            return variant.getSku();
        }
        Product product = item.getProduct();
        return product != null ? product.getSku() : null;
    }

    private Integer resolveAvailableQuantity(CartItem item) {
        ProductVariant variant = item.getVariant();
        if (variant != null && variant.getQuantity() != null) {
            return variant.getQuantity();
        }
        Product product = item.getProduct();
        return product != null ? product.getStockQuantity() : null;
    }

    private boolean resolveInStock(CartItem item) {
        Integer available = resolveAvailableQuantity(item);
        if (available == null) {
            return true;
        }
        return available > 0;
    }
}
