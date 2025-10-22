package com.example.rbac.admin.checkout.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.checkout.dto.AdminOrderCouponOption;
import com.example.rbac.admin.checkout.dto.AdminOrderCustomerOption;
import com.example.rbac.admin.checkout.dto.AdminOrderPreviewLineRequest;
import com.example.rbac.admin.checkout.dto.AdminOrderPreviewRequest;
import com.example.rbac.admin.checkout.dto.AdminOrderPreviewResponse;
import com.example.rbac.admin.checkout.dto.AdminOrderProductOption;
import com.example.rbac.admin.checkout.dto.AdminOrderProductSearchResult;
import com.example.rbac.admin.checkout.dto.AdminOrderProductVariantOption;
import com.example.rbac.admin.checkout.dto.AdminOrderRequest;
import com.example.rbac.admin.roles.model.Role;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.repository.UserRepository;
import com.example.rbac.admin.categories.model.Category;
import com.example.rbac.admin.products.model.Product;
import com.example.rbac.admin.products.model.ProductVariant;
import com.example.rbac.admin.products.model.ProductVariantValue;
import com.example.rbac.admin.attributes.model.AttributeValue;
import com.example.rbac.admin.products.repository.ProductRepository;
import com.example.rbac.admin.coupons.model.Coupon;
import com.example.rbac.admin.coupons.model.DiscountType;
import com.example.rbac.admin.coupons.repository.CouponRepository;
import com.example.rbac.admin.finance.taxrate.model.TaxRate;
import com.example.rbac.admin.finance.taxrate.model.TaxRateType;
import com.example.rbac.client.checkout.dto.AppliedCouponDto;
import com.example.rbac.client.checkout.dto.CheckoutAddressDto;
import com.example.rbac.client.checkout.dto.CheckoutAddressType;
import com.example.rbac.client.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.client.checkout.dto.CheckoutOrderRequest;
import com.example.rbac.client.checkout.dto.CheckoutSummaryDto;
import com.example.rbac.client.checkout.dto.OrderDetailDto;
import com.example.rbac.client.checkout.dto.OrderLineDto;
import com.example.rbac.client.checkout.dto.OrderSummaryDto;
import com.example.rbac.client.checkout.dto.PaymentMethodDto;
import com.example.rbac.client.checkout.model.CheckoutOrder;
import com.example.rbac.client.checkout.repository.CheckoutOrderRepository;
import com.example.rbac.client.checkout.service.CheckoutService;
import com.example.rbac.client.checkout.service.OrderService;
import com.example.rbac.common.exception.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class OrderAdminService {

    private static final String CUSTOMER_ROLE_KEY = "CUSTOMER";

    private final CheckoutOrderRepository orderRepository;
    private final ActivityRecorder activityRecorder;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final CouponRepository couponRepository;
    private final OrderService orderService;
    private final CheckoutService checkoutService;
    private final ObjectMapper objectMapper;

    public OrderAdminService(CheckoutOrderRepository orderRepository,
                             ActivityRecorder activityRecorder,
                             UserRepository userRepository,
                             ProductRepository productRepository,
                             CouponRepository couponRepository,
                             OrderService orderService,
                             CheckoutService checkoutService,
                             ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.activityRecorder = activityRecorder;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.couponRepository = couponRepository;
        this.orderService = orderService;
        this.checkoutService = checkoutService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public OrderDetailDto createOrder(AdminOrderRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order request is required");
        }

        User customer = userRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        ensureCustomerRole(customer);

        List<CheckoutOrderLineRequest> sanitizedLines = sanitizeLines(request.getLines());
        if (sanitizedLines.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Add at least one item to the order");
        }

        OrderSummaryDto summary = buildSummary(request, sanitizedLines);
        CheckoutAddressDto shippingAddress = sanitizeAddress(request.getShippingAddress(), CheckoutAddressType.SHIPPING);
        CheckoutAddressDto billingAddress = sanitizeAddress(request.getBillingAddress(), CheckoutAddressType.BILLING);
        PaymentMethodDto paymentMethod = sanitizePaymentMethod(request.getPaymentMethod());

        String customerEmail = resolveCustomerEmail(request, customer);
        String customerName = resolveCustomerName(request, customer);

        var response = orderService.createOrder(
                customer.getId(),
                customerEmail,
                customerName,
                shippingAddress,
                billingAddress,
                paymentMethod,
                summary,
                sanitizedLines
        );

        CheckoutOrder createdOrder = orderRepository.findById(response.getOrderId())
                .orElseThrow(() -> new IllegalStateException("Created order was not persisted"));

        if (StringUtils.hasText(request.getStatus())) {
            createdOrder.setStatus(request.getStatus().trim());
            orderRepository.save(createdOrder);
        }

        Map<String, Object> context = new HashMap<>();
        context.put("orderId", response.getOrderId());
        context.put("orderNumber", response.getOrderNumber());
        context.put("customerId", customer.getId());
        context.put("createdAt", Instant.now().toString());
        activityRecorder.record("Orders", "CREATE", "Created order " + response.getOrderNumber(), "SUCCESS", context);

        return orderService.getOrder(response.getOrderId());
    }

    @Transactional
    public OrderDetailDto updateOrder(Long orderId, AdminOrderRequest request) {
        if (orderId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order ID is required");
        }
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order request is required");
        }

        CheckoutOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        User customer = userRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        ensureCustomerRole(customer);

        List<CheckoutOrderLineRequest> sanitizedLines = sanitizeLines(request.getLines());
        if (sanitizedLines.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Add at least one item to the order");
        }

        OrderSummaryDto summary = buildSummary(request, sanitizedLines);
        CheckoutAddressDto shippingAddress = sanitizeAddress(request.getShippingAddress(), CheckoutAddressType.SHIPPING);
        CheckoutAddressDto billingAddress = sanitizeAddress(request.getBillingAddress(), CheckoutAddressType.BILLING);
        PaymentMethodDto paymentMethod = sanitizePaymentMethod(request.getPaymentMethod());

        order.setUserId(customer.getId());
        order.setCustomerEmail(resolveCustomerEmail(request, customer));
        order.setCustomerName(resolveCustomerName(request, customer));
        if (StringUtils.hasText(request.getStatus())) {
            order.setStatus(request.getStatus().trim());
        }

        order.setSummaryJson(writeJson(summary));
        order.setShippingAddressJson(writeJson(shippingAddress));
        order.setBillingAddressJson(writeJson(billingAddress));
        order.setPaymentMethodJson(writeJson(paymentMethod));
        order.setLinesJson(writeJson(toOrderLineDtos(sanitizedLines)));

        orderRepository.save(order);

        Map<String, Object> context = new HashMap<>();
        context.put("orderId", order.getId());
        context.put("orderNumber", resolveOrderReference(order));
        context.put("customerId", customer.getId());
        context.put("updatedAt", Instant.now().toString());
        activityRecorder.record("Orders", "UPDATE", "Updated order " + resolveOrderReference(order), "SUCCESS", context);

        return orderService.getOrder(orderId);
    }

    @Transactional(readOnly = true)
    public List<AdminOrderCustomerOption> searchCustomers(String search, int size) {
        int pageSize = Math.max(1, Math.min(size, 100));
        PageRequest pageRequest = PageRequest.of(0, pageSize);
        Page<User> page;
        if (StringUtils.hasText(search)) {
            page = userRepository.searchCustomersByRoleKey(CUSTOMER_ROLE_KEY, search.trim(), pageRequest);
        } else {
            page = userRepository.findCustomersByRoleKey(CUSTOMER_ROLE_KEY, pageRequest);
        }
        return page.getContent().stream()
                .map(user -> new AdminOrderCustomerOption(user.getId(), user.getFullName(), user.getEmail()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdminOrderProductSearchResult> searchProducts(String search, int size) {
        int pageSize = Math.max(1, Math.min(size, 50));
        PageRequest pageRequest = PageRequest.of(0, pageSize);
        Page<Product> page;
        if (StringUtils.hasText(search)) {
            page = productRepository.findByNameContainingIgnoreCase(search.trim(), pageRequest);
        } else {
            page = productRepository.findAll(pageRequest);
        }
        LinkedHashMap<Long, Product> ordered = new LinkedHashMap<>();
        for (Product product : page.getContent()) {
            if (product != null && product.getId() != null) {
                ordered.putIfAbsent(product.getId(), product);
            }
        }
        if (StringUtils.hasText(search)) {
            productRepository.findBySkuIgnoreCase(search.trim())
                    .ifPresent(product -> ordered.putIfAbsent(product.getId(), product));
        }
        return ordered.values().stream()
                .limit(pageSize)
                .map(this::toProductSearchResult)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminOrderProductOption getProductOption(Long productId) {
        if (productId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Product ID is required");
        }
        Product product = productRepository.findForAdminOrderComposerById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        return toProductOption(product);
    }

    @Transactional(readOnly = true)
    public List<AdminOrderCouponOption> listActiveCoupons(int size) {
        int pageSize = Math.max(1, Math.min(size, 100));
        Instant now = Instant.now();
        return couponRepository.findActiveCoupons(now).stream()
                .sorted(Comparator.comparing(Coupon::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .limit(pageSize)
                .map(this::toCouponOption)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminOrderPreviewResponse previewOrder(AdminOrderPreviewRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Preview request is required");
        }
        if (request.getCustomerId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Customer is required for preview");
        }
        User customer = userRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        List<CheckoutOrderLineRequest> lines = buildLinesFromPreview(request.getLines());
        if (lines.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Add at least one item to preview the order");
        }
        CheckoutOrderRequest checkoutRequest = new CheckoutOrderRequest();
        checkoutRequest.setShippingAddressId(request.getShippingAddressId());
        checkoutRequest.setBillingAddressId(request.isBillingSameAsShipping()
                ? request.getShippingAddressId()
                : request.getBillingAddressId());
        checkoutRequest.setSameAsShipping(request.isBillingSameAsShipping());
        checkoutRequest.setCouponCode(StringUtils.hasText(request.getCouponCode())
                ? request.getCouponCode().trim()
                : null);
        checkoutRequest.setLines(lines);

        CheckoutSummaryDto summaryDto = checkoutService.buildSummary(customer.getId(), checkoutRequest);
        OrderSummaryDto summary = summaryDto != null ? summaryDto.getOrderSummary() : null;
        AdminOrderPreviewResponse response = new AdminOrderPreviewResponse();
        response.setSummary(summary);
        response.getLines().addAll(lines);
        return response;
    }

    @Transactional
    public void deleteOrder(Long orderId) {
        CheckoutOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String orderNumber = resolveOrderReference(order);
        Long customerId = order.getUserId();

        orderRepository.delete(order);

        Map<String, Object> context = new HashMap<>();
        context.put("orderId", order.getId());
        context.put("orderNumber", orderNumber);
        if (customerId != null) {
            context.put("customerId", customerId);
        }
        context.put("deletedAt", Instant.now().toString());

        activityRecorder.record("Orders", "DELETE", "Deleted order " + orderNumber, "SUCCESS", context);
    }

    private List<CheckoutOrderLineRequest> sanitizeLines(List<CheckoutOrderLineRequest> lines) {
        if (CollectionUtils.isEmpty(lines)) {
            return List.of();
        }
        Map<Long, Product> productCache = new HashMap<>();
        List<CheckoutOrderLineRequest> sanitized = new ArrayList<>();
        for (CheckoutOrderLineRequest line : lines) {
            if (line == null) {
                continue;
            }
            int quantity = Optional.ofNullable(line.getQuantity()).orElse(0);
            if (quantity <= 0) {
                continue;
            }
            Long productId = line.getProductId();
            if (productId != null) {
                sanitized.add(buildOrderLine(productId, line.getVariantId(), quantity, productCache));
                continue;
            }
            sanitized.add(buildManualLine(line, quantity));
        }
        return sanitized;
    }

    private List<CheckoutOrderLineRequest> buildLinesFromPreview(List<AdminOrderPreviewLineRequest> previewLines) {
        if (CollectionUtils.isEmpty(previewLines)) {
            return List.of();
        }
        Map<Long, Product> productCache = new HashMap<>();
        List<CheckoutOrderLineRequest> results = new ArrayList<>();
        for (AdminOrderPreviewLineRequest previewLine : previewLines) {
            if (previewLine == null) {
                continue;
            }
            int quantity = Math.max(1, previewLine.getQuantity());
            results.add(buildOrderLine(previewLine.getProductId(), previewLine.getVariantId(), quantity, productCache));
        }
        return results;
    }

    private CheckoutOrderLineRequest buildManualLine(CheckoutOrderLineRequest line, int quantity) {
        CheckoutOrderLineRequest copy = new CheckoutOrderLineRequest();
        copy.setProductId(line.getProductId());
        copy.setName(trimToNull(line.getName()));
        copy.setQuantity(quantity);
        BigDecimal unitPrice = normalizeMoney(line.getUnitPrice());
        copy.setUnitPrice(unitPrice);
        BigDecimal taxRate = normalizeRate(line.getTaxRate());
        if (taxRate.compareTo(BigDecimal.ZERO) > 0) {
            copy.setTaxRate(taxRate);
        }
        copy.setProductSlug(trimToNull(line.getProductSlug()));
        copy.setVariantId(line.getVariantId());
        copy.setVariantSku(trimToNull(line.getVariantSku()));
        copy.setVariantLabel(trimToNull(line.getVariantLabel()));
        return copy;
    }

    private CheckoutOrderLineRequest buildOrderLine(Long productId, Long variantId, int quantity, Map<Long, Product> cache) {
        if (productId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Product ID is required for order line");
        }
        Product product = fetchProduct(productId, cache);
        ProductVariant variant = resolveVariant(product, variantId);
        CheckoutOrderLineRequest line = new CheckoutOrderLineRequest();
        line.setProductId(product.getId());
        line.setName(product.getName());
        line.setProductSlug(product.getSlug());
        line.setQuantity(quantity);
        BigDecimal unitPrice = calculateUnitPrice(product, variant);
        line.setUnitPrice(unitPrice);
        BigDecimal taxRate = calculateEffectiveTaxRate(product, unitPrice);
        if (taxRate.compareTo(BigDecimal.ZERO) > 0) {
            line.setTaxRate(taxRate);
        }
        if (variant != null) {
            line.setVariantId(variant.getId());
            line.setVariantSku(trimToNull(variant.getSku()));
            line.setVariantLabel(resolveVariantLabel(variant));
        } else {
            line.setVariantLabel("Default");
        }
        return line;
    }

    private Product fetchProduct(Long productId, Map<Long, Product> cache) {
        if (cache.containsKey(productId)) {
            return cache.get(productId);
        }
        Product product = productRepository.findForAdminOrderComposerById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        cache.put(productId, product);
        return product;
    }

    private void ensureCustomerRole(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Customer not found");
        }
        boolean isCustomer = user.getRoles() != null && user.getRoles().stream().anyMatch(this::isCustomerRole);
        if (!isCustomer) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected user is not a customer");
        }
    }

    private boolean isCustomerRole(Role role) {
        return role != null && StringUtils.hasText(role.getKey()) && role.getKey().equalsIgnoreCase(CUSTOMER_ROLE_KEY);
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

    private String resolveVariantLabel(ProductVariant variant) {
        if (variant == null) {
            return null;
        }
        if (StringUtils.hasText(variant.getVariantKey())) {
            return variant.getVariantKey();
        }
        if (CollectionUtils.isEmpty(variant.getValues())) {
            return null;
        }
        return variant.getValues().stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(value -> Optional.ofNullable(value.getPosition()).orElse(0)))
                .map(ProductVariantValue::getAttributeValue)
                .filter(Objects::nonNull)
                .map(this::formatAttributeValue)
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" · "));
    }

    private String formatAttributeValue(AttributeValue attributeValue) {
        String attributeName = attributeValue.getAttribute() != null ? attributeValue.getAttribute().getName() : null;
        String value = attributeValue.getValue();
        if (!StringUtils.hasText(attributeName)) {
            return value;
        }
        if (!StringUtils.hasText(value)) {
            return attributeName;
        }
        return attributeName + ": " + value;
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

    private BigDecimal calculateEffectiveTaxRate(Product product, BigDecimal unitPrice) {
        Set<TaxRate> taxRates = product.getTaxRates();
        if (CollectionUtils.isEmpty(taxRates)) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        BigDecimal price = unitPrice != null ? unitPrice : BigDecimal.ZERO;
        BigDecimal totalRate = BigDecimal.ZERO;
        for (TaxRate taxRate : taxRates) {
            if (taxRate == null || taxRate.getRateValue() == null) {
                continue;
            }
            if (taxRate.getRateType() == TaxRateType.PERCENTAGE) {
                totalRate = totalRate.add(taxRate.getRateValue()
                        .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
            } else if (taxRate.getRateType() == TaxRateType.FLAT && price.compareTo(BigDecimal.ZERO) > 0) {
                totalRate = totalRate.add(taxRate.getRateValue()
                        .divide(price, 6, RoundingMode.HALF_UP));
            }
        }
        if (totalRate.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return totalRate.setScale(4, RoundingMode.HALF_UP);
    }

    private AdminOrderProductSearchResult toProductSearchResult(Product product) {
        AdminOrderProductSearchResult result = new AdminOrderProductSearchResult();
        result.setId(product.getId());
        result.setName(product.getName());
        result.setSku(product.getSku());
        if (product.getThumbnail() != null) {
            result.setThumbnailUrl(product.getThumbnail().getUrl());
        }
        if (product.getBrand() != null) {
            result.setBrandName(product.getBrand().getName());
        }
        result.setPrimaryCategory(resolvePrimaryCategory(product));
        return result;
    }

    private AdminOrderProductOption toProductOption(Product product) {
        AdminOrderProductOption option = new AdminOrderProductOption();
        option.setId(product.getId());
        option.setName(product.getName());
        option.setSku(product.getSku());
        option.setSlug(product.getSlug());
        if (product.getThumbnail() != null) {
            option.setThumbnailUrl(product.getThumbnail().getUrl());
        }
        if (product.getBrand() != null) {
            option.setBrandName(product.getBrand().getName());
        }
        option.setPrimaryCategory(resolvePrimaryCategory(product));
        BigDecimal basePrice = calculateUnitPrice(product, null);
        option.setBaseUnitPrice(basePrice);
        option.setEffectiveTaxRate(calculateEffectiveTaxRate(product, basePrice));
        if (CollectionUtils.isEmpty(product.getVariants())) {
            AdminOrderProductVariantOption variantOption = new AdminOrderProductVariantOption();
            variantOption.setId(null);
            variantOption.setLabel("Default");
            variantOption.setSku(product.getSku());
            variantOption.setUnitPrice(basePrice);
            variantOption.setTaxRate(option.getEffectiveTaxRate());
            variantOption.setAvailableQuantity(product.getStockQuantity());
            option.getVariants().add(variantOption);
        } else {
            product.getVariants().stream()
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(variant -> Optional.ofNullable(variant.getDisplayOrder()).orElse(0)))
                    .forEach(variant -> option.getVariants().add(toVariantOption(product, variant)));
        }
        return option;
    }

    private AdminOrderProductVariantOption toVariantOption(Product product, ProductVariant variant) {
        AdminOrderProductVariantOption variantOption = new AdminOrderProductVariantOption();
        variantOption.setId(variant.getId());
        variantOption.setLabel(resolveVariantLabel(variant));
        variantOption.setSku(trimToNull(variant.getSku()));
        BigDecimal unitPrice = calculateUnitPrice(product, variant);
        variantOption.setUnitPrice(unitPrice);
        variantOption.setTaxRate(calculateEffectiveTaxRate(product, unitPrice));
        variantOption.setAvailableQuantity(variant.getQuantity());
        return variantOption;
    }

    private String resolvePrimaryCategory(Product product) {
        if (CollectionUtils.isEmpty(product.getCategories())) {
            return null;
        }
        return product.getCategories().stream()
                .filter(Objects::nonNull)
                .map(Category::getName)
                .filter(StringUtils::hasText)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .findFirst()
                .orElse(null);
    }

    private AdminOrderCouponOption toCouponOption(Coupon coupon) {
        AdminOrderCouponOption option = new AdminOrderCouponOption();
        option.setId(coupon.getId());
        option.setCode(coupon.getCode());
        option.setName(coupon.getName());
        option.setDiscountType(coupon.getDiscountType());
        option.setDiscountValue(coupon.getDiscountValue());
        return option;
    }

    private OrderSummaryDto buildSummary(AdminOrderRequest request, List<CheckoutOrderLineRequest> lines) {
        BigDecimal productTotal = lines.stream()
                .map(this::calculateLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        OrderSummaryDto incoming = request.getSummary();
        BigDecimal shippingTotal = normalizeMoney(incoming != null ? incoming.getShippingTotal() : null);
        BigDecimal discountTotal = normalizeMoney(incoming != null ? incoming.getDiscountTotal() : null);

        BigDecimal computedTaxTotal = lines.stream()
                .map(line -> calculateLineTotal(line).multiply(normalizeRate(line.getTaxRate())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal taxTotal = normalizeMoney(incoming != null && incoming.getTaxTotal() != null
                ? incoming.getTaxTotal()
                : computedTaxTotal);

        BigDecimal grandTotal = productTotal.add(shippingTotal)
                .add(taxTotal)
                .subtract(discountTotal)
                .max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        OrderSummaryDto summary = new OrderSummaryDto();
        summary.setProductTotal(productTotal);
        summary.setShippingTotal(shippingTotal);
        summary.setTaxTotal(taxTotal);
        summary.setDiscountTotal(discountTotal);
        summary.setGrandTotal(grandTotal);
        if (incoming != null) {
            summary.setShippingBreakdown(incoming.getShippingBreakdown());
            summary.setTaxLines(incoming.getTaxLines() != null
                    ? new ArrayList<>(incoming.getTaxLines())
                    : new ArrayList<>());
            summary.setAppliedCoupon(copyAppliedCoupon(incoming.getAppliedCoupon()));
        } else {
            summary.setTaxLines(new ArrayList<>());
        }
        return summary;
    }

    private CheckoutAddressDto sanitizeAddress(CheckoutAddressDto address, CheckoutAddressType fallbackType) {
        if (address == null) {
            return null;
        }
        CheckoutAddressDto copy = new CheckoutAddressDto();
        copy.setId(address.getId());
        copy.setType(address.getType() != null ? address.getType() : fallbackType);
        copy.setCountryId(address.getCountryId());
        copy.setStateId(address.getStateId());
        copy.setCityId(address.getCityId());
        copy.setCountryName(trimToNull(address.getCountryName()));
        copy.setStateName(trimToNull(address.getStateName()));
        copy.setCityName(trimToNull(address.getCityName()));
        copy.setFullName(trimToNull(address.getFullName()));
        copy.setMobileNumber(trimToNull(address.getMobileNumber()));
        copy.setPinCode(trimToNull(address.getPinCode()));
        copy.setAddressLine1(trimToNull(address.getAddressLine1()));
        copy.setAddressLine2(trimToNull(address.getAddressLine2()));
        copy.setLandmark(trimToNull(address.getLandmark()));
        copy.setDefaultAddress(address.isDefaultAddress());
        copy.setCreatedAt(address.getCreatedAt());
        copy.setUpdatedAt(address.getUpdatedAt());
        return copy;
    }

    private PaymentMethodDto sanitizePaymentMethod(PaymentMethodDto method) {
        if (method == null) {
            return null;
        }
        PaymentMethodDto copy = new PaymentMethodDto();
        copy.setKey(trimToNull(method.getKey()));
        copy.setDisplayName(trimToNull(method.getDisplayName()));
        copy.setEnabled(method.isEnabled());
        copy.setNotes(trimToNull(method.getNotes()));
        return copy;
    }

    private List<OrderLineDto> toOrderLineDtos(List<CheckoutOrderLineRequest> lines) {
        return lines.stream()
                .map(this::toOrderLineDto)
                .collect(Collectors.toList());
    }

    private OrderLineDto toOrderLineDto(CheckoutOrderLineRequest line) {
        OrderLineDto dto = new OrderLineDto();
        dto.setProductId(line.getProductId());
        dto.setName(line.getName());
        dto.setProductSlug(line.getProductSlug());
        dto.setVariantId(line.getVariantId());
        dto.setVariantSku(line.getVariantSku());
        dto.setVariantLabel(line.getVariantLabel());
        dto.setQuantity(line.getQuantity());
        BigDecimal unitPrice = normalizeMoney(line.getUnitPrice());
        dto.setUnitPrice(unitPrice);
        dto.setLineTotal(calculateLineTotal(line));
        if (line.getTaxRate() != null) {
            dto.setTaxRate(normalizeRate(line.getTaxRate()));
        }
        return dto;
    }

    private String resolveCustomerEmail(AdminOrderRequest request, User customer) {
        if (request != null && StringUtils.hasText(request.getCustomerEmail())) {
            return request.getCustomerEmail().trim();
        }
        return customer.getEmail();
    }

    private String resolveCustomerName(AdminOrderRequest request, User customer) {
        if (request != null && StringUtils.hasText(request.getCustomerName())) {
            return request.getCustomerName().trim();
        }
        return customer.getFullName();
    }

    private AppliedCouponDto copyAppliedCoupon(AppliedCouponDto source) {
        if (source == null) {
            return null;
        }
        AppliedCouponDto copy = new AppliedCouponDto();
        copy.setId(source.getId());
        copy.setName(trimToNull(source.getName()));
        copy.setCode(trimToNull(source.getCode()));
        copy.setDiscountType(source.getDiscountType());
        copy.setDiscountValue(source.getDiscountValue());
        copy.setDiscountAmount(source.getDiscountAmount());
        copy.setDescription(trimToNull(source.getDescription()));
        return copy;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal normalizeRate(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return value.setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateLineTotal(CheckoutOrderLineRequest line) {
        BigDecimal unitPrice = normalizeMoney(line.getUnitPrice());
        BigDecimal quantity = BigDecimal.valueOf(line.getQuantity());
        return unitPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
    }

    private String writeJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize order payload", ex);
        }
    }

    private String resolveOrderReference(CheckoutOrder order) {
        if (order == null) {
            return "#UNKNOWN";
        }
        String orderNumber = order.getOrderNumber();
        if (orderNumber != null && !orderNumber.isBlank()) {
            return orderNumber;
        }
        Long id = order.getId();
        if (id != null) {
            return "#" + id;
        }
        return "#UNKNOWN";
    }
}
