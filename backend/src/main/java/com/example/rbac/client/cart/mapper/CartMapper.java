package com.example.rbac.client.cart.mapper;

import com.example.rbac.client.cart.dto.CartDto;
import com.example.rbac.client.cart.dto.CartItemDto;
import com.example.rbac.client.cart.model.Cart;
import com.example.rbac.client.cart.model.CartItem;
import com.example.rbac.admin.products.model.MediaAsset;
import com.example.rbac.admin.products.model.Product;
import com.example.rbac.admin.products.model.ProductGalleryImage;
import com.example.rbac.admin.products.model.ProductVariant;
import com.example.rbac.admin.products.model.ProductVariantMedia;
import com.example.rbac.admin.finance.taxrate.model.TaxRate;
import com.example.rbac.admin.finance.taxrate.model.TaxRateType;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
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
        List<CartItem> sortedItems = new ArrayList<>(cart.getItems());
        sortedItems.sort(Comparator
                .comparing(CartItem::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(CartItem::getId, Comparator.nullsLast(Comparator.naturalOrder())));
        for (CartItem item : sortedItems) {
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
            dto.setThumbnailUrl(resolveThumbnailUrl(product, item.getVariant()));
        }
        dto.setTaxRate(resolveEffectiveTaxRate(item));
        return dto;
    }

    private BigDecimal resolveEffectiveTaxRate(CartItem item) {
        if (item == null) {
            return null;
        }
        Product product = item.getProduct();
        if (product == null || CollectionUtils.isEmpty(product.getTaxRates())) {
            return null;
        }
        BigDecimal unitPrice = item.getUnitPrice();
        if (unitPrice == null) {
            unitPrice = BigDecimal.ZERO;
        }
        BigDecimal totalRate = BigDecimal.ZERO;
        for (TaxRate taxRate : product.getTaxRates()) {
            if (taxRate == null || taxRate.getRateValue() == null) {
                continue;
            }
            if (taxRate.getRateType() == TaxRateType.PERCENTAGE) {
                totalRate = totalRate.add(taxRate.getRateValue()
                        .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
            } else if (taxRate.getRateType() == TaxRateType.FLAT && unitPrice.compareTo(BigDecimal.ZERO) > 0) {
                totalRate = totalRate.add(taxRate.getRateValue()
                        .divide(unitPrice, 6, RoundingMode.HALF_UP));
            }
        }
        if (totalRate.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return totalRate.setScale(6, RoundingMode.HALF_UP);
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

    private String resolveThumbnailUrl(Product product, ProductVariant variant) {
        if (variant != null && variant.getMedia() != null) {
            for (ProductVariantMedia media : variant.getMedia()) {
                if (media != null && media.getMedia() != null && media.getMedia().getUrl() != null
                        && !media.getMedia().getUrl().isBlank()) {
                    return media.getMedia().getUrl();
                }
            }
        }
        MediaAsset thumbnail = product.getThumbnail();
        if (thumbnail != null && thumbnail.getUrl() != null && !thumbnail.getUrl().isBlank()) {
            return thumbnail.getUrl();
        }
        if (product.getGalleryImages() != null) {
            for (ProductGalleryImage image : product.getGalleryImages()) {
                if (image != null && image.getMedia() != null && image.getMedia().getUrl() != null
                        && !image.getMedia().getUrl().isBlank()) {
                    return image.getMedia().getUrl();
                }
            }
        }
        return null;
    }
}
