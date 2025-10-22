package com.example.rbac.admin.checkout.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.checkout.dto.AdminOrderRequest;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OrderAdminService {

    private final CheckoutOrderRepository orderRepository;
    private final ActivityRecorder activityRecorder;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    public OrderAdminService(CheckoutOrderRepository orderRepository,
                             ActivityRecorder activityRecorder,
                             UserRepository userRepository,
                             OrderService orderService,
                             ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.activityRecorder = activityRecorder;
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.objectMapper = objectMapper;
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
