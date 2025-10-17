package com.example.rbac.cart.service;

import com.example.rbac.cart.dto.AddCartItemRequest;
import com.example.rbac.cart.dto.CartDto;
import com.example.rbac.cart.dto.GuestCartLineRequest;
import com.example.rbac.cart.dto.MergeCartRequest;
import com.example.rbac.cart.dto.UpdateCartItemRequest;
import com.example.rbac.cart.mapper.CartMapper;
import com.example.rbac.cart.model.Cart;
import com.example.rbac.cart.model.CartItem;
import com.example.rbac.cart.repository.CartRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.products.model.DiscountType;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductVariant;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartMapper cartMapper;

    public CartService(CartRepository cartRepository,
                       ProductRepository productRepository,
                       UserRepository userRepository,
                       CartMapper cartMapper) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartMapper = cartMapper;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public CartDto getCurrentCart(UserPrincipal principal) {
        User user = resolveUser(principal);
        Optional<Cart> existing = cartRepository.findByUserId(user.getId());
        return existing.map(cartMapper::toDto).orElseGet(this::emptyCartDto);
    }

    @Transactional
    @PreAuthorize("isAuthenticated()")
    public CartDto addItem(AddCartItemRequest request, UserPrincipal principal) {
        User user = resolveUser(principal);
        Cart cart = getOrCreateCart(user);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        ProductVariant variant = resolveVariant(product, request.getVariantId());
        int quantity = Optional.ofNullable(request.getQuantity()).orElse(1);
        CartItem item = findExistingItem(cart, product, variant);
        int newQuantity = quantity;
        if (item != null && item.getQuantity() != null) {
            newQuantity = item.getQuantity() + quantity;
        }
        enforceQuantityBounds(product, variant, newQuantity);
        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
            item.setVariant(variant);
            cart.getItems().add(item);
        }
        item.setQuantity(newQuantity);
        item.setUnitPrice(calculateUnitPrice(product, variant));
        item.setVariantLabel(variant != null ? variant.getVariantKey() : null);
        cartRepository.save(cart);
        cartRepository.flush();
        return cartMapper.toDto(cart);
    }

    @Transactional
    @PreAuthorize("isAuthenticated()")
    public CartDto updateItem(Long itemId, UpdateCartItemRequest request, UserPrincipal principal) {
        User user = resolveUser(principal);
        Cart cart = getExistingCart(user.getId());
        CartItem item = cart.getItems().stream()
                .filter(existing -> Objects.equals(existing.getId(), itemId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart item not found"));
        int quantity = Optional.ofNullable(request.getQuantity()).orElse(1);
        Product product = item.getProduct();
        ProductVariant variant = item.getVariant();
        enforceQuantityBounds(product, variant, quantity);
        item.setQuantity(quantity);
        item.setUnitPrice(calculateUnitPrice(product, variant));
        cartRepository.save(cart);
        cartRepository.flush();
        return cartMapper.toDto(cart);
    }

    @Transactional
    @PreAuthorize("isAuthenticated()")
    public CartDto removeItem(Long itemId, UserPrincipal principal) {
        User user = resolveUser(principal);
        Cart cart = getExistingCart(user.getId());
        boolean removed = cart.getItems().removeIf(item -> Objects.equals(item.getId(), itemId));
        if (!removed) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Cart item not found");
        }
        cartRepository.save(cart);
        cartRepository.flush();
        return cartMapper.toDto(cart);
    }

    @Transactional
    @PreAuthorize("isAuthenticated()")
    public CartDto mergeGuestCart(MergeCartRequest request, UserPrincipal principal) {
        User user = resolveUser(principal);
        Cart cart = getOrCreateCart(user);
        if (request != null && !CollectionUtils.isEmpty(request.getItems())) {
            for (GuestCartLineRequest line : request.getItems()) {
                if (line == null) {
                    continue;
                }
                Product product = productRepository.findById(line.getProductId())
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
                ProductVariant variant = resolveVariant(product, line.getVariantId());
                int quantity = Optional.ofNullable(line.getQuantity()).orElse(1);
                CartItem item = findExistingItem(cart, product, variant);
                int newQuantity = quantity;
                if (item != null && item.getQuantity() != null) {
                    newQuantity = item.getQuantity() + quantity;
                }
                enforceQuantityBounds(product, variant, newQuantity);
                if (item == null) {
                    item = new CartItem();
                    item.setCart(cart);
                    item.setProduct(product);
                    item.setVariant(variant);
                    cart.getItems().add(item);
                }
                item.setQuantity(newQuantity);
                item.setUnitPrice(calculateUnitPrice(product, variant));
                item.setVariantLabel(variant != null ? variant.getVariantKey() : null);
            }
            cartRepository.save(cart);
            cartRepository.flush();
        }
        return cartMapper.toDto(cart);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN')")
    public CartDto getCartForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Optional<Cart> cart = cartRepository.findByUserId(user.getId());
        return cart.map(cartMapper::toDto).orElseGet(this::emptyCartDto);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto addItemForUser(Long userId, AddCartItemRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Cart cart = getOrCreateCart(user);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        ProductVariant variant = resolveVariant(product, request.getVariantId());
        int quantity = Optional.ofNullable(request.getQuantity()).orElse(1);
        CartItem item = findExistingItem(cart, product, variant);
        int newQuantity = quantity;
        if (item != null && item.getQuantity() != null) {
            newQuantity = item.getQuantity() + quantity;
        }
        enforceQuantityBounds(product, variant, newQuantity);
        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
            item.setVariant(variant);
            cart.getItems().add(item);
        }
        item.setQuantity(newQuantity);
        item.setUnitPrice(calculateUnitPrice(product, variant));
        item.setVariantLabel(variant != null ? variant.getVariantKey() : null);
        cartRepository.save(cart);
        cartRepository.flush();
        return cartMapper.toDto(cart);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto updateItemForUser(Long userId, Long itemId, UpdateCartItemRequest request) {
        Cart cart = getExistingCart(userId);
        CartItem item = cart.getItems().stream()
                .filter(existing -> Objects.equals(existing.getId(), itemId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart item not found"));
        int quantity = Optional.ofNullable(request.getQuantity()).orElse(1);
        Product product = item.getProduct();
        ProductVariant variant = item.getVariant();
        enforceQuantityBounds(product, variant, quantity);
        item.setQuantity(quantity);
        item.setUnitPrice(calculateUnitPrice(product, variant));
        cartRepository.save(cart);
        cartRepository.flush();
        return cartMapper.toDto(cart);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('USER_UPDATE','USER_UPDATE_GLOBAL')")
    public CartDto removeItemForUser(Long userId, Long itemId) {
        Cart cart = getExistingCart(userId);
        boolean removed = cart.getItems().removeIf(existing -> Objects.equals(existing.getId(), itemId));
        if (!removed) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Cart item not found");
        }
        cartRepository.save(cart);
        cartRepository.flush();
        return cartMapper.toDto(cart);
    }

    private Cart getExistingCart(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart is empty"));
    }

    private Cart getOrCreateCart(User user) {
        return cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart created = new Cart();
                    created.setUser(user);
                    created.setItems(new ArrayList<>());
                    return cartRepository.save(created);
                });
    }

    private CartItem findExistingItem(Cart cart, Product product, ProductVariant variant) {
        for (CartItem item : cart.getItems()) {
            if (!Objects.equals(item.getProduct() != null ? item.getProduct().getId() : null, product.getId())) {
                continue;
            }
            Long existingVariantId = item.getVariant() != null ? item.getVariant().getId() : null;
            Long variantId = variant != null ? variant.getId() : null;
            if (Objects.equals(existingVariantId, variantId)) {
                return item;
            }
        }
        return null;
    }

    private void enforceQuantityBounds(Product product, ProductVariant variant, int quantity) {
        if (quantity < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Quantity must be at least 1");
        }
        Integer minPurchase = product.getMinPurchaseQuantity();
        if (minPurchase != null && quantity < minPurchase) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Minimum purchase quantity is " + minPurchase);
        }
        Integer available = resolveAvailableStock(product, variant);
        if (available != null && quantity > available) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Only " + available + " quantities are available in stock.");
        }
    }

    private Integer resolveAvailableStock(Product product, ProductVariant variant) {
        if (variant != null && variant.getQuantity() != null) {
            return Math.max(variant.getQuantity(), 0);
        }
        if (product.getStockQuantity() != null) {
            return Math.max(product.getStockQuantity(), 0);
        }
        return null;
    }

    private BigDecimal calculateUnitPrice(Product product, ProductVariant variant) {
        BigDecimal price = Optional.ofNullable(product.getUnitPrice()).orElse(BigDecimal.ZERO);
        if (isDiscountActive(product)) {
            BigDecimal discountValue = Optional.ofNullable(product.getDiscountValue()).orElse(BigDecimal.ZERO);
            if (product.getDiscountType() == DiscountType.PERCENTAGE) {
                BigDecimal percentage = discountValue.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                price = price.subtract(price.multiply(percentage));
            } else if (product.getDiscountType() == DiscountType.FLAT) {
                price = price.subtract(discountValue);
            }
        }
        if (variant != null && variant.getPriceAdjustment() != null) {
            price = price.add(variant.getPriceAdjustment());
        }
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            price = BigDecimal.ZERO;
        }
        return price.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isDiscountActive(Product product) {
        if (product.getDiscountType() == null || product.getDiscountValue() == null) {
            return false;
        }
        Instant now = Instant.now();
        Instant start = product.getDiscountStartAt();
        Instant end = product.getDiscountEndAt();
        if (start != null && now.isBefore(start)) {
            return false;
        }
        if (end != null && now.isAfter(end)) {
            return false;
        }
        return true;
    }

    private ProductVariant resolveVariant(Product product, Long variantId) {
        if (variantId == null) {
            return null;
        }
        return product.getVariants().stream()
                .filter(variant -> Objects.equals(variant.getId(), variantId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Variant not found for product"));
    }

    private User resolveUser(UserPrincipal principal) {
        if (principal == null || principal.getUser() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return principal.getUser();
    }

    private CartDto emptyCartDto() {
        return new CartDto();
    }
}
