package com.example.rbac.client.checkout.service;

import com.example.rbac.client.checkout.dto.AppliedCouponDto;
import com.example.rbac.client.checkout.dto.CheckoutAddressDto;
import com.example.rbac.client.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.client.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.client.checkout.dto.OrderDetailDto;
import com.example.rbac.client.checkout.dto.OrderLineDto;
import com.example.rbac.client.checkout.dto.OrderListItemDto;
import com.example.rbac.client.checkout.dto.OrderSummaryDto;
import com.example.rbac.client.checkout.dto.PaymentMethodDto;
import com.example.rbac.client.checkout.model.CheckoutOrder;
import com.example.rbac.client.checkout.repository.CheckoutOrderRepository;
import com.example.rbac.common.exception.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final String DEFAULT_STATUS = "PROCESSING";
    private static final TypeReference<List<OrderLineDto>> ORDER_LINE_LIST = new TypeReference<>() {
    };

    private final CheckoutOrderRepository orderRepository;
    private final ObjectMapper objectMapper;

    public OrderService(CheckoutOrderRepository orderRepository, ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CheckoutOrderResponse createOrder(Long userId,
                                             String customerEmail,
                                             String customerName,
                                             CheckoutAddressDto shippingAddress,
                                             CheckoutAddressDto billingAddress,
                                             PaymentMethodDto paymentMethod,
                                             OrderSummaryDto summary,
                                             List<CheckoutOrderLineRequest> lineRequests) {
        List<OrderLineDto> orderLines = toOrderLines(lineRequests);
        CheckoutOrder order = new CheckoutOrder();
        order.setUserId(userId);
        order.setCustomerEmail(customerEmail);
        order.setCustomerName(customerName);
        order.setStatus(DEFAULT_STATUS);
        order.setSummaryJson(writeJson(copySummary(summary)));
        order.setShippingAddressJson(writeJson(copyAddress(shippingAddress)));
        order.setBillingAddressJson(writeJson(copyAddress(billingAddress)));
        order.setPaymentMethodJson(writeJson(copyPaymentMethod(paymentMethod)));
        order.setLinesJson(writeJson(orderLines));

        CheckoutOrder saved = orderRepository.save(order);
        if (!StringUtils.hasText(saved.getOrderNumber()) && saved.getId() != null) {
            saved.setOrderNumber(generateOrderNumber(saved.getId()));
            saved = orderRepository.save(saved);
        }
        return toOrderResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderListItemDto> listOrders() {
        List<CheckoutOrder> orders = orderRepository.findAllByOrderByCreatedAtDesc();
        if (CollectionUtils.isEmpty(orders)) {
            return List.of();
        }
        List<OrderListItemDto> results = new ArrayList<>();
        for (CheckoutOrder order : orders) {
            results.add(toListItem(order));
        }
        return results;
    }

    @Transactional(readOnly = true)
    public List<OrderListItemDto> listOrdersForUser(Long userId) {
        List<CheckoutOrder> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (CollectionUtils.isEmpty(orders)) {
            return List.of();
        }
        List<OrderListItemDto> results = new ArrayList<>();
        for (CheckoutOrder order : orders) {
            results.add(toListItem(order));
        }
        return results;
    }

    @Transactional(readOnly = true)
    public OrderDetailDto getOrder(Long orderId) {
        CheckoutOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        return toDetail(order);
    }

    @Transactional(readOnly = true)
    public OrderDetailDto getOrderForUser(Long userId, Long orderId) {
        CheckoutOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!Objects.equals(order.getUserId(), userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        }
        return toDetail(order);
    }

    private CheckoutOrderResponse toOrderResponse(CheckoutOrder order) {
        CheckoutOrderResponse response = new CheckoutOrderResponse();
        response.setOrderId(order.getId());
        response.setOrderNumber(ensureOrderNumber(order));
        response.setStatus(order.getStatus());
        response.setCustomerId(order.getUserId());
        response.setCustomerEmail(order.getCustomerEmail());
        response.setCustomerName(order.getCustomerName());
        response.setCreatedAt(order.getCreatedAt());
        response.setSummary(copySummary(readSummary(order.getSummaryJson())));
        List<OrderLineDto> lines = readLines(order.getLinesJson());
        response.setLines(copyLines(lines));
        response.setShippingAddress(copyAddress(readAddress(order.getShippingAddressJson())));
        response.setBillingAddress(copyAddress(readAddress(order.getBillingAddressJson())));
        response.setPaymentMethod(copyPaymentMethod(readPaymentMethod(order.getPaymentMethodJson())));
        return response;
    }

    private OrderListItemDto toListItem(CheckoutOrder order) {
        OrderListItemDto dto = new OrderListItemDto();
        dto.setId(order.getId());
        dto.setOrderNumber(ensureOrderNumber(order));
        dto.setCustomerId(order.getUserId());
        dto.setCustomerName(order.getCustomerName());
        dto.setCustomerEmail(order.getCustomerEmail());
        dto.setStatus(order.getStatus());
        dto.setCreatedAt(order.getCreatedAt());
        dto.setSummary(copySummary(readSummary(order.getSummaryJson())));
        dto.setLines(copyLines(readLines(order.getLinesJson())));
        return dto;
    }

    private OrderDetailDto toDetail(CheckoutOrder order) {
        OrderDetailDto detail = new OrderDetailDto();
        detail.setId(order.getId());
        detail.setOrderNumber(ensureOrderNumber(order));
        detail.setStatus(order.getStatus());
        detail.setCreatedAt(order.getCreatedAt());
        detail.setCustomerId(order.getUserId());
        detail.setCustomerName(order.getCustomerName());
        detail.setCustomerEmail(order.getCustomerEmail());
        detail.setShippingAddress(copyAddress(readAddress(order.getShippingAddressJson())));
        detail.setBillingAddress(copyAddress(readAddress(order.getBillingAddressJson())));
        detail.setPaymentMethod(copyPaymentMethod(readPaymentMethod(order.getPaymentMethodJson())));
        detail.setSummary(copySummary(readSummary(order.getSummaryJson())));
        detail.setLines(copyLines(readLines(order.getLinesJson())));
        return detail;
    }

    private List<OrderLineDto> toOrderLines(List<CheckoutOrderLineRequest> lineRequests) {
        if (CollectionUtils.isEmpty(lineRequests)) {
            return List.of();
        }
        List<OrderLineDto> lines = new ArrayList<>();
        for (CheckoutOrderLineRequest request : lineRequests) {
            if (request == null || request.getQuantity() == null || request.getQuantity() <= 0) {
                continue;
            }
            lines.add(toOrderLineDto(request));
        }
        return lines;
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
        BigDecimal unitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : BigDecimal.ZERO;
        dto.setUnitPrice(unitPrice.setScale(2, RoundingMode.HALF_UP));
        BigDecimal quantity = BigDecimal.valueOf(line.getQuantity());
        dto.setLineTotal(unitPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP));
        if (line.getTaxRate() != null) {
            dto.setTaxRate(line.getTaxRate());
        }
        return dto;
    }

    private CheckoutAddressDto copyAddress(CheckoutAddressDto source) {
        if (source == null) {
            return null;
        }
        CheckoutAddressDto copy = new CheckoutAddressDto();
        copy.setId(source.getId());
        copy.setType(source.getType());
        copy.setCountryId(source.getCountryId());
        copy.setStateId(source.getStateId());
        copy.setCityId(source.getCityId());
        copy.setCountryName(source.getCountryName());
        copy.setStateName(source.getStateName());
        copy.setCityName(source.getCityName());
        copy.setFullName(source.getFullName());
        copy.setMobileNumber(source.getMobileNumber());
        copy.setPinCode(source.getPinCode());
        copy.setAddressLine1(source.getAddressLine1());
        copy.setAddressLine2(source.getAddressLine2());
        copy.setLandmark(source.getLandmark());
        copy.setDefaultAddress(source.isDefaultAddress());
        copy.setCreatedAt(source.getCreatedAt());
        copy.setUpdatedAt(source.getUpdatedAt());
        return copy;
    }

    private PaymentMethodDto copyPaymentMethod(PaymentMethodDto source) {
        if (source == null) {
            return null;
        }
        PaymentMethodDto copy = new PaymentMethodDto();
        copy.setKey(source.getKey());
        copy.setDisplayName(source.getDisplayName());
        copy.setEnabled(source.isEnabled());
        copy.setNotes(source.getNotes());
        return copy;
    }

    private OrderSummaryDto copySummary(OrderSummaryDto summary) {
        if (summary == null) {
            return null;
        }
        OrderSummaryDto copy = new OrderSummaryDto();
        copy.setProductTotal(summary.getProductTotal());
        copy.setTaxTotal(summary.getTaxTotal());
        copy.setShippingTotal(summary.getShippingTotal());
        copy.setGrandTotal(summary.getGrandTotal());
        copy.setDiscountTotal(summary.getDiscountTotal());
        copy.setShippingBreakdown(summary.getShippingBreakdown());
        copy.setTaxLines(summary.getTaxLines() != null ? new ArrayList<>(summary.getTaxLines()) : List.of());
        copy.setAppliedCoupon(copyAppliedCoupon(summary.getAppliedCoupon()));
        copy.setShippingMethod(summary.getShippingMethod());
        return copy;
    }

    private List<OrderLineDto> copyLines(List<OrderLineDto> lines) {
        if (CollectionUtils.isEmpty(lines)) {
            return List.of();
        }
        List<OrderLineDto> copies = new ArrayList<>(lines.size());
        for (OrderLineDto line : lines) {
            if (line == null) {
                continue;
            }
            OrderLineDto copy = new OrderLineDto();
            copy.setProductId(line.getProductId());
            copy.setName(line.getName());
            copy.setProductSlug(line.getProductSlug());
            copy.setVariantId(line.getVariantId());
            copy.setVariantSku(line.getVariantSku());
            copy.setVariantLabel(line.getVariantLabel());
            copy.setQuantity(line.getQuantity());
            copy.setUnitPrice(line.getUnitPrice());
            copy.setLineTotal(line.getLineTotal());
            copy.setTaxRate(line.getTaxRate());
            copies.add(copy);
        }
        return copies;
    }

    private AppliedCouponDto copyAppliedCoupon(AppliedCouponDto source) {
        if (source == null) {
            return null;
        }
        AppliedCouponDto copy = new AppliedCouponDto();
        copy.setId(source.getId());
        copy.setName(source.getName());
        copy.setCode(source.getCode());
        copy.setDiscountType(source.getDiscountType());
        copy.setDiscountValue(source.getDiscountValue());
        copy.setDiscountAmount(source.getDiscountAmount());
        copy.setDescription(source.getDescription());
        return copy;
    }

    private OrderSummaryDto readSummary(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, OrderSummaryDto.class);
        } catch (JsonProcessingException ex) {
            log.warn("Unable to deserialize order summary: {}", ex.getMessage());
            return null;
        }
    }

    private CheckoutAddressDto readAddress(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, CheckoutAddressDto.class);
        } catch (JsonProcessingException ex) {
            log.warn("Unable to deserialize order address: {}", ex.getMessage());
            return null;
        }
    }

    private PaymentMethodDto readPaymentMethod(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, PaymentMethodDto.class);
        } catch (JsonProcessingException ex) {
            log.warn("Unable to deserialize payment method: {}", ex.getMessage());
            return null;
        }
    }

    private List<OrderLineDto> readLines(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, ORDER_LINE_LIST);
        } catch (JsonProcessingException ex) {
            log.warn("Unable to deserialize order lines: {}", ex.getMessage());
            return Collections.emptyList();
        }
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

    private String ensureOrderNumber(CheckoutOrder order) {
        if (order == null) {
            return null;
        }
        if (StringUtils.hasText(order.getOrderNumber())) {
            return order.getOrderNumber();
        }
        if (order.getId() == null) {
            return null;
        }
        String generated = generateOrderNumber(order.getId());
        order.setOrderNumber(generated);
        orderRepository.save(order);
        return generated;
    }

    private String generateOrderNumber(Long id) {
        long sequenceBase = 999L;
        long numeric = (id != null ? id : 0L) + sequenceBase;
        return "ORD-" + numeric;
    }
}

