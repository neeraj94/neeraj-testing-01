package com.example.rbac.admin.checkout.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.checkout.dto.AdminOrderCustomerOptionDto;
import com.example.rbac.admin.checkout.dto.AdminOrderProductOptionDto;
import com.example.rbac.admin.checkout.dto.AdminOrderRequest;
import com.example.rbac.admin.finance.taxrate.model.TaxRateType;
import com.example.rbac.admin.products.dto.ProductCategoryDto;
import com.example.rbac.admin.products.dto.ProductDto;
import com.example.rbac.admin.products.dto.ProductTaxRateDto;
import com.example.rbac.admin.products.dto.ProductVariantDto;
import com.example.rbac.admin.products.dto.ProductVariantValueDto;
import com.example.rbac.admin.checkout.dto.AdminOrderProductVariantOptionDto;
import com.example.rbac.admin.products.model.Product;
import com.example.rbac.admin.products.repository.ProductRepository;
import com.example.rbac.admin.products.service.ProductService;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.repository.UserRepository;
import com.example.rbac.client.checkout.dto.AppliedCouponDto;
import com.example.rbac.client.checkout.dto.CheckoutAddressDto;
import com.example.rbac.client.checkout.dto.CheckoutAddressType;
import com.example.rbac.client.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.client.checkout.dto.OrderDetailDto;
import com.example.rbac.client.checkout.dto.OrderLineDto;
import com.example.rbac.client.checkout.dto.OrderSummaryDto;
import com.example.rbac.client.checkout.dto.PaymentMethodDto;
import com.example.rbac.client.checkout.model.CheckoutOrder;
import com.example.rbac.client.checkout.repository.CheckoutOrderRepository;
import com.example.rbac.client.checkout.service.OrderService;
import com.example.rbac.common.exception.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class OrderAdminService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderAdminService.class);
    private static final String CUSTOMER_ROLE_KEY = "CUSTOMER";
    private static final int MAX_LOOKUP_SIZE = 50;

    private final CheckoutOrderRepository orderRepository;
    private final ActivityRecorder activityRecorder;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final ProductRepository productRepository;
    private final ProductService productService;
    private final ObjectMapper objectMapper;

    public OrderAdminService(CheckoutOrderRepository orderRepository,
                             ActivityRecorder activityRecorder,
                             UserRepository userRepository,
                             OrderService orderService,
                             ProductRepository productRepository,
                             ProductService productService,
                             ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.activityRecorder = activityRecorder;
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.productRepository = productRepository;
        this.productService = productService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<AdminOrderCustomerOptionDto> listCustomerOptions(String search, int limit) {
        int pageSize = Math.min(Math.max(limit, 1), MAX_LOOKUP_SIZE);
        Pageable pageable = PageRequest.of(0, pageSize, Sort.by(Sort.Order.asc("fullName"), Sort.Order.asc("id")));
        String normalizedSearch = search != null ? search.trim() : null;
        Page<User> page;
        if (StringUtils.hasText(normalizedSearch)) {
            page = userRepository.searchCustomersByRoleKey(CUSTOMER_ROLE_KEY, normalizedSearch, pageable);
        } else {
            page = userRepository.findCustomersByRoleKey(CUSTOMER_ROLE_KEY, pageable);
        }
        if (page == null || CollectionUtils.isEmpty(page.getContent())) {
            return Collections.emptyList();
        }
        return page.getContent().stream()
                .filter(user -> user != null && user.getId() != null)
                .map(user -> {
                    AdminOrderCustomerOptionDto dto = new AdminOrderCustomerOptionDto();
                    dto.setId(user.getId());
                    dto.setFullName(StringUtils.hasText(user.getFullName()) ? user.getFullName() : user.getEmail());
                    dto.setEmail(user.getEmail());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdminOrderProductOptionDto> searchProductOptions(String search, int limit) {
        int pageSize = Math.min(Math.max(limit, 1), MAX_LOOKUP_SIZE);
        Pageable pageable = PageRequest.of(0, pageSize, Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id")));
        String normalizedSearch = search != null ? search.trim() : null;
        Page<Product> page;
        if (StringUtils.hasText(normalizedSearch)) {
            page = productRepository.searchByNameOrSku(normalizedSearch, pageable);
            if (page.isEmpty()) {
                page = productRepository.findByNameContainingIgnoreCase(normalizedSearch, pageable);
            }
        } else {
            page = productRepository.findAll(pageable);
        }
        if (page == null || CollectionUtils.isEmpty(page.getContent())) {
            return Collections.emptyList();
        }
        List<AdminOrderProductOptionDto> options = new ArrayList<>();
        for (Product product : page.getContent()) {
            if (product == null || product.getId() == null) {
                continue;
            }
            try {
                ProductDto detail = productService.get(product.getId());
                options.addAll(toProductOptions(detail));
            } catch (Exception ex) {
                LOGGER.warn("Unable to load product {} for order selection", product.getId(), ex);
            }
        }
        return options;
    }

    @Transactional(readOnly = true)
    public List<AdminOrderProductOptionDto> getProductOptions(Long productId) {
        if (productId == null) {
            return Collections.emptyList();
        }
        try {
            ProductDto detail = productService.get(productId);
            return toProductOptions(detail);
        } catch (Exception ex) {
            LOGGER.warn("Unable to load product {} for order selection", productId, ex);
            return Collections.emptyList();
        }
    }

    @Transactional
    public OrderDetailDto createOrder(AdminOrderRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order request is required");
        }

        User customer = userRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));

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

    private List<AdminOrderProductOptionDto> toProductOptions(ProductDto detail) {
        if (detail == null) {
            return Collections.emptyList();
        }
        BigDecimal basePrice = detail.getPricing() != null ? detail.getPricing().getUnitPrice() : null;
        BigDecimal normalizedBasePrice = normalizeMoney(basePrice);
        ProductTaxRateDto taxRateDto = resolvePrimaryTaxRate(detail);
        BigDecimal taxRate = resolveTaxRateDecimal(taxRateDto);
        String categoryName = resolvePrimaryCategory(detail);

        List<AdminOrderProductOptionDto> options = new ArrayList<>();
        List<ProductVariantDto> variants = detail.getVariants();
        if (!CollectionUtils.isEmpty(variants)) {
            List<AdminOrderProductVariantOptionDto> variantOptions = buildVariantOptions(variants, normalizedBasePrice);
            for (AdminOrderProductVariantOptionDto variantOption : variantOptions) {
                AdminOrderProductOptionDto option = createBaseProductOption(detail, taxRateDto, taxRate, categoryName);
                option.setVariantId(variantOption.getId());
                option.setVariantSku(variantOption.getSku());
                option.setVariantKey(variantOption.getKey());
                option.setVariantLabel(variantOption.getLabel());
                option.setUnitPrice(variantOption.getUnitPrice());
                option.setHasVariants(true);
                option.setVariants(variantOptions);
                options.add(option);
            }
        } else {
            AdminOrderProductOptionDto option = createBaseProductOption(detail, taxRateDto, taxRate, categoryName);
            option.setUnitPrice(normalizeMoney(basePrice));
            option.setHasVariants(false);
            option.setVariants(Collections.emptyList());
            options.add(option);
        }
        return options;
    }

    private List<AdminOrderProductVariantOptionDto> buildVariantOptions(List<ProductVariantDto> variants,
                                                                        BigDecimal normalizedBasePrice) {
        if (CollectionUtils.isEmpty(variants)) {
            return Collections.emptyList();
        }
        List<AdminOrderProductVariantOptionDto> variantOptions = new ArrayList<>();
        for (ProductVariantDto variant : variants) {
            if (variant == null) {
                continue;
            }
            AdminOrderProductVariantOptionDto dto = new AdminOrderProductVariantOptionDto();
            dto.setId(variant.getId());
            dto.setSku(variant.getSku());
            dto.setKey(variant.getKey());
            dto.setLabel(buildVariantLabel(variant));
            BigDecimal price = normalizedBasePrice != null ? normalizedBasePrice : BigDecimal.ZERO;
            if (variant.getPriceAdjustment() != null) {
                price = price.add(variant.getPriceAdjustment());
            }
            dto.setUnitPrice(normalizeMoney(price));
            variantOptions.add(dto);
        }
        return variantOptions;
    }

    private AdminOrderProductOptionDto createBaseProductOption(ProductDto detail,
                                                               ProductTaxRateDto taxRateDto,
                                                               BigDecimal taxRate,
                                                               String categoryName) {
        AdminOrderProductOptionDto dto = new AdminOrderProductOptionDto();
        dto.setProductId(detail.getId());
        dto.setProductName(detail.getName());
        dto.setProductSlug(detail.getSlug());
        dto.setProductSku(detail.getPricing() != null ? detail.getPricing().getSku() : null);
        dto.setProductVariety(StringUtils.hasText(detail.getUnit()) ? detail.getUnit() : null);
        dto.setProductSlot(categoryName);
        dto.setBrandName(detail.getBrand() != null ? detail.getBrand().getName() : null);
        dto.setThumbnailUrl(detail.getThumbnail() != null ? detail.getThumbnail().getUrl() : null);
        if (taxRateDto != null) {
            dto.setTaxRateId(taxRateDto.getId());
            dto.setTaxRateName(taxRateDto.getName());
        }
        dto.setTaxRate(taxRate);
        return dto;
    }

    private String resolvePrimaryCategory(ProductDto detail) {
        if (detail.getCategories() == null) {
            return null;
        }
        return detail.getCategories().stream()
                .filter(Objects::nonNull)
                .map(ProductCategoryDto::getName)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
    }

    private ProductTaxRateDto resolvePrimaryTaxRate(ProductDto detail) {
        if (detail.getTaxRates() == null) {
            return null;
        }
        return detail.getTaxRates().stream()
                .filter(Objects::nonNull)
                .filter(rate -> rate.getRateValue() != null)
                .findFirst()
                .orElse(null);
    }

    private BigDecimal resolveTaxRateDecimal(ProductTaxRateDto taxRateDto) {
        if (taxRateDto == null || taxRateDto.getRateValue() == null) {
            return normalizeRate(null);
        }
        BigDecimal value = taxRateDto.getRateValue();
        if (taxRateDto.getRateType() == TaxRateType.PERCENTAGE) {
            return normalizeRate(value.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
        }
        return normalizeRate(value);
    }

    private String buildVariantLabel(ProductVariantDto variant) {
        if (variant == null || CollectionUtils.isEmpty(variant.getValues())) {
            return variant != null ? variant.getKey() : null;
        }
        String label = variant.getValues().stream()
                .filter(Objects::nonNull)
                .map(value -> {
                    String option = value.getValue();
                    if (!StringUtils.hasText(option)) {
                        return null;
                    }
                    String attribute = value.getAttributeName();
                    return StringUtils.hasText(attribute) ? attribute + ": " + option : option;
                })
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" / "));
        if (StringUtils.hasText(label)) {
            return label;
        }
        return variant.getKey();
    }

    private List<CheckoutOrderLineRequest> sanitizeLines(List<CheckoutOrderLineRequest> lines) {
        if (CollectionUtils.isEmpty(lines)) {
            return List.of();
        }
        List<CheckoutOrderLineRequest> sanitized = new ArrayList<>();
        for (CheckoutOrderLineRequest line : lines) {
            if (line == null) {
                continue;
            }
            Integer quantity = line.getQuantity();
            if (quantity == null || quantity <= 0) {
                continue;
            }
            CheckoutOrderLineRequest copy = new CheckoutOrderLineRequest();
            copy.setProductId(line.getProductId());
            copy.setName(trimToNull(line.getName()));
            copy.setQuantity(quantity);
            copy.setUnitPrice(normalizeMoney(line.getUnitPrice()));
            copy.setTaxRate(normalizeRate(line.getTaxRate()));
            copy.setProductSlug(trimToNull(line.getProductSlug()));
            copy.setVariantId(line.getVariantId());
            copy.setVariantSku(trimToNull(line.getVariantSku()));
            copy.setVariantLabel(trimToNull(line.getVariantLabel()));
            sanitized.add(copy);
        }
        return sanitized;
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
            summary.setShippingMethod(trimToNull(incoming.getShippingMethod()));
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
