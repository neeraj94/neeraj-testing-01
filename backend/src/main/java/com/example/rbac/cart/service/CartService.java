package com.example.rbac.cart.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.cart.dto.AddCartItemRequest;
import com.example.rbac.cart.dto.AdminCartSummaryDto;
import com.example.rbac.cart.dto.CartDto;
import com.example.rbac.cart.dto.CartItemDto;
import com.example.rbac.cart.dto.CartSortOption;
import com.example.rbac.cart.dto.CartSummaryRow;
import com.example.rbac.cart.dto.GuestCartLineRequest;
import com.example.rbac.cart.dto.MergeCartRequest;
import com.example.rbac.cart.dto.UpdateCartItemRequest;
import com.example.rbac.cart.mapper.CartMapper;
import com.example.rbac.cart.model.Cart;
import com.example.rbac.cart.model.CartItem;
import com.example.rbac.cart.repository.CartRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.products.model.DiscountType;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductVariant;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartMapper cartMapper;
    private final ActivityRecorder activityRecorder;

    public CartService(CartRepository cartRepository,
                       ProductRepository productRepository,
                       UserRepository userRepository,
                       CartMapper cartMapper,
                       ActivityRecorder activityRecorder) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartMapper = cartMapper;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN')")
    public PageResponse<AdminCartSummaryDto> listAdminCarts(int page,
                                                           int size,
                                                           String search,
                                                           String sort,
                                                           UserPrincipal principal) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        boolean canViewAll = hasAuthority("USER_VIEW_GLOBAL");

        if (!canViewAll) {
            User currentUser = findCurrentUser(principal)
                    .orElseThrow(() -> new AccessDeniedException("Access to other carts is restricted."));
            Optional<Cart> cart = cartRepository.findByUserId(currentUser.getId());
            if (cart.isEmpty() || !matchesOwnSearch(cart.get(), search)) {
                Page<AdminCartSummaryDto> emptyPage = new PageImpl<>(List.of(),
                        PageRequest.of(safePage, safeSize), 0);
                return PageResponse.from(emptyPage);
            }
            AdminCartSummaryDto summary = buildSummaryForCart(cart.get());
            List<AdminCartSummaryDto> pageContent = safePage == 0 ? List.of(summary) : List.of();
            Page<AdminCartSummaryDto> singleResultPage = new PageImpl<>(pageContent,
                    PageRequest.of(safePage, safeSize), 1);
            return PageResponse.from(singleResultPage);
        }

        Pageable pageable = PageRequest.of(safePage, safeSize);
        CartSortOption sortOption = CartSortOption.fromString(sort);
        String pattern = (search == null || search.isBlank()) ? null : "%" + search.trim().toLowerCase() + "%";

        Page<CartSummaryRow> summaryPage = cartRepository.searchActiveCartSummaries(pattern, sortOption, pageable);
        List<Long> cartIds = summaryPage.getContent().stream()
                .map(CartSummaryRow::cartId)
                .filter(Objects::nonNull)
                .toList();

        java.util.Map<Long, Cart> detailedCarts;
        if (cartIds.isEmpty()) {
            detailedCarts = Collections.emptyMap();
        } else {
            List<Cart> carts = cartRepository.findByIdIn(cartIds);
            detailedCarts = carts.stream()
                    .filter(cart -> cart.getId() != null)
                    .collect(Collectors.toMap(Cart::getId, Function.identity(), (left, right) -> left, HashMap::new));
        }

        List<AdminCartSummaryDto> summaries = new ArrayList<>();
        for (CartSummaryRow row : summaryPage.getContent()) {
            AdminCartSummaryDto summary = new AdminCartSummaryDto();
            summary.setCartId(row.cartId());
            summary.setUserId(row.userId());
            summary.setUserName(row.userName());
            summary.setUserEmail(row.userEmail());
            summary.setUpdatedAt(row.updatedAt());
            summary.setSubtotal(row.subtotal());
            summary.setTotalQuantity(row.quantity());

            Cart detailed = detailedCarts.get(row.cartId());
            if (detailed != null) {
                AdminCartSummaryDto detailedSummary = buildSummaryForCart(detailed);
                if (detailedSummary.getItems() != null) {
                    summary.setItems(detailedSummary.getItems());
                }
                if (detailedSummary.getTotalQuantity() != null
                        && detailedSummary.getTotalQuantity() > summary.getTotalQuantity()) {
                    summary.setTotalQuantity(detailedSummary.getTotalQuantity());
                }
                if (detailedSummary.getSubtotal() != null
                        && detailedSummary.getSubtotal().compareTo(summary.getSubtotal()) > 0) {
                    summary.setSubtotal(detailedSummary.getSubtotal());
                }
            }
            summaries.add(summary);
        }

        Page<AdminCartSummaryDto> mappedPage = new PageImpl<>(summaries, pageable, summaryPage.getTotalElements());
        return PageResponse.from(mappedPage);
    }

    @Transactional(readOnly = true)
    public CartDto getCurrentCart(UserPrincipal principal) {
        User user = resolveUser(principal);
        Optional<Cart> existing = cartRepository.findByUserId(user.getId());
        return existing.map(cartMapper::toDto).orElseGet(this::emptyCartDto);
    }

    @Transactional
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
    public CartDto clearCart(UserPrincipal principal) {
        User user = resolveUser(principal);
        Optional<Cart> existing = cartRepository.findByUserId(user.getId());
        if (existing.isEmpty()) {
            return emptyCartDto();
        }
        Cart cart = existing.get();
        if (cart.getItems().isEmpty()) {
            return cartMapper.toDto(cart);
        }
        cart.getItems().clear();
        cartRepository.save(cart);
        cartRepository.flush();
        return cartMapper.toDto(cart);
    }

    @Transactional
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
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL')")
    public CartDto getCartForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Optional<Cart> cart = cartRepository.findByUserId(user.getId());
        return cart.map(cartMapper::toDto).orElseGet(this::emptyCartDto);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_CREATE')")
    public CartDto createCartForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        Optional<Cart> existing = cartRepository.findByUserId(user.getId());
        if (existing.isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Cart already exists for user");
        }
        Cart created = new Cart();
        created.setUser(user);
        created.setItems(new ArrayList<>());
        Cart saved = cartRepository.save(created);
        activityRecorder.record("Carts", "CREATE", "Created cart for user " + user.getEmail(), "SUCCESS",
                buildContext(saved, user));
        return cartMapper.toDto(saved);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and (hasAuthority('USER_CREATE') or hasAuthority('USER_UPDATE'))")
    public CartDto addItemForUser(Long userId, AddCartItemRequest request) {
        boolean hasCreatePermission = hasAuthority("USER_CREATE");
        boolean hasUpdatePermission = hasAuthority("USER_UPDATE");

        Cart cart = cartRepository.findByUserId(userId).orElse(null);
        boolean cartCreated = false;
        if (cart == null) {
            if (!hasCreatePermission) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Create permission is required to add new cart items.");
            }
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
            cart = new Cart();
            cart.setUser(user);
            cart.setItems(new ArrayList<>());
            cartCreated = true;
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        ProductVariant variant = resolveVariant(product, request.getVariantId());
        int quantity = Optional.ofNullable(request.getQuantity()).orElse(1);
        CartItem item = findExistingItem(cart, product, variant);

        if (item == null && !hasCreatePermission) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Create permission is required to add new cart items.");
        }
        if (item != null && !hasUpdatePermission) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Edit permission is required to modify existing cart items.");
        }
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
        Cart saved = cartRepository.save(cart);
        cartRepository.flush();

        User cartUser = saved.getUser();
        String userLabel = cartUser != null && cartUser.getEmail() != null
                ? cartUser.getEmail()
                : "#" + userId;

        if (cartCreated) {
            activityRecorder.record("Carts", "CREATE",
                    "Created cart for user " + userLabel,
                    "SUCCESS", buildContext(saved, cartUser));
        }

        activityRecorder.record("Carts", "ADD_ITEM",
                "Added item to cart for user " + userLabel,
                "SUCCESS", buildContext(saved, cartUser));
        return cartMapper.toDto(saved);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_UPDATE')")
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
        Cart saved = cartRepository.save(cart);
        cartRepository.flush();
        activityRecorder.record("Carts", "UPDATE_ITEM",
                "Updated cart item for userId " + userId,
                "SUCCESS", buildContext(saved, saved.getUser()));
        return cartMapper.toDto(saved);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_DELETE')")
    public CartDto removeItemForUser(Long userId, Long itemId) {
        Cart cart = getExistingCart(userId);
        boolean removed = cart.getItems().removeIf(existing -> Objects.equals(existing.getId(), itemId));
        if (!removed) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Cart item not found");
        }
        Cart saved = cartRepository.save(cart);
        cartRepository.flush();
        activityRecorder.record("Carts", "REMOVE_ITEM",
                "Removed cart item for userId " + userId,
                "SUCCESS", buildContext(saved, saved.getUser()));
        return cartMapper.toDto(saved);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_VIEW_GLOBAL') and hasAuthority('USER_DELETE')")
    public CartDto clearCartForUser(Long userId) {
        Cart cart = getExistingCart(userId);
        cart.getItems().clear();
        Cart saved = cartRepository.save(cart);
        cartRepository.flush();
        activityRecorder.record("Carts", "CLEAR",
                "Cleared cart for userId " + userId,
                "SUCCESS", buildContext(saved, saved.getUser()));
        return cartMapper.toDto(saved);
    }

    private Cart getExistingCart(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart not found for user"));
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

    private Optional<User> findCurrentUser(UserPrincipal principal) {
        if (principal != null && principal.getUser() != null && principal.getUser().getId() != null) {
            return Optional.of(principal.getUser());
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal userPrincipal
                && userPrincipal.getUser() != null && userPrincipal.getUser().getId() != null) {
            return Optional.of(userPrincipal.getUser());
        }
        return Optional.empty();
    }

    private boolean matchesOwnSearch(Cart cart, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String normalized = search.trim().toLowerCase(Locale.ROOT);
        if (cart.getId() != null && String.valueOf(cart.getId()).contains(normalized)) {
            return true;
        }
        User user = cart.getUser();
        if (user == null) {
            return false;
        }
        if (user.getFullName() != null && user.getFullName().toLowerCase(Locale.ROOT).contains(normalized)) {
            return true;
        }
        if (user.getEmail() != null && user.getEmail().toLowerCase(Locale.ROOT).contains(normalized)) {
            return true;
        }
        return user.getId() != null && String.valueOf(user.getId()).contains(normalized);
    }

    private AdminCartSummaryDto buildSummaryForCart(Cart cart) {
        AdminCartSummaryDto summary = new AdminCartSummaryDto();
        if (cart == null) {
            return summary;
        }
        summary.setCartId(cart.getId());
        summary.setUpdatedAt(cart.getUpdatedAt());
        User cartUser = cart.getUser();
        if (cartUser != null) {
            summary.setUserId(cartUser.getId());
            summary.setUserName(cartUser.getFullName());
            summary.setUserEmail(cartUser.getEmail());
        }
        CartDto cartDto = cartMapper.toDto(cart);
        List<CartItemDto> items = Optional.ofNullable(cartDto.getItems()).orElseGet(Collections::emptyList);
        summary.setItems(items);
        if (cartDto.getTotalQuantity() != null) {
            summary.setTotalQuantity(cartDto.getTotalQuantity());
        }
        if (cartDto.getSubtotal() != null) {
            summary.setSubtotal(cartDto.getSubtotal());
        }
        return summary;
    }

    private boolean hasAuthority(String authority) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        for (GrantedAuthority grantedAuthority : authentication.getAuthorities()) {
            if (authority.equals(grantedAuthority.getAuthority())) {
                return true;
            }
        }
        return false;
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

    private java.util.Map<String, Object> buildContext(Cart cart, User user) {
        java.util.HashMap<String, Object> context = new java.util.HashMap<>();
        if (cart != null && cart.getId() != null) {
            context.put("cartId", cart.getId());
        }
        if (user != null) {
            context.put("userId", user.getId());
            context.put("userEmail", user.getEmail());
        }
        context.put("itemCount", cart != null && cart.getItems() != null ? cart.getItems().size() : 0);
        return context;
    }
}
