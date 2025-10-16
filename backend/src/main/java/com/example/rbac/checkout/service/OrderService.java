package com.example.rbac.checkout.service;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.checkout.dto.OrderLineDto;
import com.example.rbac.checkout.dto.OrderListItemDto;
import com.example.rbac.checkout.dto.OrderSummaryDto;
import com.example.rbac.checkout.dto.PaymentMethodDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final AtomicLong orderSequence = new AtomicLong(1000L);
    private final List<OrderRecord> orders = Collections.synchronizedList(new ArrayList<>());

    public CheckoutOrderResponse createOrder(Long userId,
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
        record.shippingAddress = shippingAddress;
        record.billingAddress = billingAddress;
        record.paymentMethod = paymentMethod;
        record.summary = summary;
        record.createdAt = now;
        record.lines = toOrderLines(lineRequests);
        orders.add(record);

        CheckoutOrderResponse response = new CheckoutOrderResponse();
        response.setOrderId(record.id);
        response.setOrderNumber(record.orderNumber);
        response.setSummary(summary);
        response.setCreatedAt(now);
        return response;
    }

    public List<OrderListItemDto> listOrders() {
        List<OrderListItemDto> results = new ArrayList<>();
        synchronized (orders) {
            for (OrderRecord record : orders) {
                OrderListItemDto dto = new OrderListItemDto();
                dto.setId(record.id);
                dto.setOrderNumber(record.orderNumber);
                dto.setCustomerId(record.userId);
                dto.setCustomerName(record.customerName);
                dto.setSummary(record.summary);
                dto.setCreatedAt(record.createdAt);
                dto.setLines(copyLines(record.lines));
                results.add(dto);
            }
        }
        return results;
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

    private static final class OrderRecord {
        private Long id;
        private String orderNumber;
        private Long userId;
        private String customerName;
        private CheckoutAddressDto shippingAddress;
        private CheckoutAddressDto billingAddress;
        private PaymentMethodDto paymentMethod;
        private OrderSummaryDto summary;
        private Instant createdAt;
        private List<OrderLineDto> lines = List.of();
    }
}
