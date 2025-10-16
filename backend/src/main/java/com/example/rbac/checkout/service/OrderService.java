package com.example.rbac.checkout.service;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.checkout.dto.OrderListItemDto;
import com.example.rbac.checkout.dto.OrderSummaryDto;
import com.example.rbac.checkout.dto.PaymentMethodDto;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OrderService {

    private final AtomicLong orderSequence = new AtomicLong(1000L);
    private final List<OrderRecord> orders = Collections.synchronizedList(new ArrayList<>());

    public CheckoutOrderResponse createOrder(Long userId,
                                             String customerName,
                                             CheckoutAddressDto shippingAddress,
                                             CheckoutAddressDto billingAddress,
                                             PaymentMethodDto paymentMethod,
                                             OrderSummaryDto summary) {
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
                results.add(dto);
            }
        }
        return results;
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
    }
}
