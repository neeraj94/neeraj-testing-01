package com.example.rbac.checkout.service;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.checkout.dto.OrderDetailDto;
import com.example.rbac.checkout.dto.OrderLineDto;
import com.example.rbac.checkout.dto.OrderListItemDto;
import com.example.rbac.checkout.dto.OrderSummaryDto;
import com.example.rbac.checkout.dto.PaymentMethodDto;
import com.example.rbac.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private static final String DEFAULT_STATUS = "PROCESSING";

    private final AtomicLong orderSequence = new AtomicLong(1000L);
    private final List<OrderRecord> orders = Collections.synchronizedList(new ArrayList<>());

    public CheckoutOrderResponse createOrder(Long userId,
                                             String customerEmail,
                                             String customerName,
                                             CheckoutAddressDto shippingAddress,
                                             CheckoutAddressDto billingAddress,
                                             PaymentMethodDto paymentMethod,
                                             OrderSummaryDto summary,
                                             List<CheckoutOrderLineRequest> lineRequests) {
        Instant now = Instant.now();
        OrderRecord record = new OrderRecord();
        record.id = orderSequence.getAndIncrement();
        record.orderNumber = "ORD-" + record.id;
        record.userId = userId;
        record.customerName = customerName;
        record.customerEmail = customerEmail;
        record.shippingAddress = copyAddress(shippingAddress);
        record.billingAddress = copyAddress(billingAddress);
        record.paymentMethod = copyPaymentMethod(paymentMethod);
        record.summary = copySummary(summary);
        record.createdAt = now;
        record.lines = toOrderLines(lineRequests);
        record.status = DEFAULT_STATUS;
        orders.add(record);

        CheckoutOrderResponse response = new CheckoutOrderResponse();
        response.setOrderId(record.id);
        response.setOrderNumber(record.orderNumber);
        response.setSummary(copySummary(record.summary));
        response.setCreatedAt(now);
        response.setLines(copyLines(record.lines));
        response.setShippingAddress(copyAddress(record.shippingAddress));
        response.setBillingAddress(copyAddress(record.billingAddress));
        response.setPaymentMethod(copyPaymentMethod(record.paymentMethod));
        response.setStatus(record.status);
        response.setCustomerId(record.userId);
        response.setCustomerName(record.customerName);
        response.setCustomerEmail(record.customerEmail);
        return response;
    }

    public List<OrderListItemDto> listOrders() {
        List<OrderListItemDto> results = new ArrayList<>();
        synchronized (orders) {
            for (OrderRecord record : orders) {
                results.add(toListItem(record));
            }
        }
        return results;
    }

    public List<OrderListItemDto> listOrdersForUser(Long userId) {
        List<OrderListItemDto> results = new ArrayList<>();
        synchronized (orders) {
            for (OrderRecord record : orders) {
                if (Objects.equals(record.userId, userId)) {
                    results.add(toListItem(record));
                }
            }
        }
        return results;
    }

    public OrderDetailDto getOrder(Long orderId) {
        OrderRecord record = findOrder(orderId);
        return toOrderDetail(record);
    }

    public OrderDetailDto getOrderForUser(Long userId, Long orderId) {
        OrderRecord record = findOrder(orderId);
        if (!Objects.equals(record.userId, userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        }
        return toOrderDetail(record);
    }

    private List<OrderLineDto> toOrderLines(List<CheckoutOrderLineRequest> lineRequests) {
        if (lineRequests == null || lineRequests.isEmpty()) {
            return List.of();
        }
        return lineRequests.stream()
                .filter(line -> line != null && line.getQuantity() != null && line.getQuantity() > 0)
                .map(this::toOrderLineDto)
                .collect(Collectors.toList());
    }

    private OrderLineDto toOrderLineDto(CheckoutOrderLineRequest line) {
        OrderLineDto dto = new OrderLineDto();
        dto.setProductId(line.getProductId());
        dto.setName(line.getName());
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

    private List<OrderLineDto> copyLines(List<OrderLineDto> lines) {
        if (lines == null || lines.isEmpty()) {
            return List.of();
        }
        return lines.stream()
                .map(line -> {
                    OrderLineDto copy = new OrderLineDto();
                    copy.setProductId(line.getProductId());
                    copy.setName(line.getName());
                    copy.setQuantity(line.getQuantity());
                    copy.setUnitPrice(line.getUnitPrice());
                    copy.setLineTotal(line.getLineTotal());
                    copy.setTaxRate(line.getTaxRate());
                    return copy;
                })
                .collect(Collectors.toList());
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
        copy.setAppliedCoupon(summary.getAppliedCoupon());
        return copy;
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

    private OrderRecord findOrder(Long orderId) {
        synchronized (orders) {
            return orders.stream()
                    .filter(record -> Objects.equals(record.id, orderId))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        }
    }

    private OrderDetailDto toOrderDetail(OrderRecord record) {
        OrderDetailDto detail = new OrderDetailDto();
        detail.setId(record.id);
        detail.setOrderNumber(record.orderNumber);
        detail.setStatus(record.status);
        detail.setCreatedAt(record.createdAt);
        detail.setCustomerId(record.userId);
        detail.setCustomerName(record.customerName);
        detail.setCustomerEmail(record.customerEmail);
        detail.setShippingAddress(copyAddress(record.shippingAddress));
        detail.setBillingAddress(copyAddress(record.billingAddress));
        detail.setPaymentMethod(copyPaymentMethod(record.paymentMethod));
        detail.setSummary(copySummary(record.summary));
        detail.setLines(copyLines(record.lines));
        return detail;
    }

    private OrderListItemDto toListItem(OrderRecord record) {
        OrderListItemDto dto = new OrderListItemDto();
        dto.setId(record.id);
        dto.setOrderNumber(record.orderNumber);
        dto.setCustomerId(record.userId);
        dto.setCustomerName(record.customerName);
        dto.setCustomerEmail(record.customerEmail);
        dto.setStatus(record.status);
        dto.setSummary(copySummary(record.summary));
        dto.setCreatedAt(record.createdAt);
        dto.setLines(copyLines(record.lines));
        return dto;
    }

    private static final class OrderRecord {
        private Long id;
        private String orderNumber;
        private Long userId;
        private String customerName;
        private String customerEmail;
        private CheckoutAddressDto shippingAddress;
        private CheckoutAddressDto billingAddress;
        private PaymentMethodDto paymentMethod;
        private OrderSummaryDto summary;
        private Instant createdAt;
        private List<OrderLineDto> lines = List.of();
        private String status;
    }
}
