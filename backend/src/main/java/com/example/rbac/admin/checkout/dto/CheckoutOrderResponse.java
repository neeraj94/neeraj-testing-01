package com.example.rbac.admin.checkout.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class CheckoutOrderResponse {

    private Long orderId;
    private String orderNumber;
    private OrderSummaryDto summary;
    private Instant createdAt;
    private List<OrderLineDto> lines = new ArrayList<>();
    private CheckoutAddressDto shippingAddress;
    private CheckoutAddressDto billingAddress;
    private PaymentMethodDto paymentMethod;
    private String status;
    private Long customerId;
    private String customerName;
    private String customerEmail;

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public OrderSummaryDto getSummary() {
        return summary;
    }

    public void setSummary(OrderSummaryDto summary) {
        this.summary = summary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<OrderLineDto> getLines() {
        return lines;
    }

    public void setLines(List<OrderLineDto> lines) {
        this.lines = lines;
    }

    public CheckoutAddressDto getShippingAddress() {
        return shippingAddress;
    }

    public void setShippingAddress(CheckoutAddressDto shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public CheckoutAddressDto getBillingAddress() {
        return billingAddress;
    }

    public void setBillingAddress(CheckoutAddressDto billingAddress) {
        this.billingAddress = billingAddress;
    }

    public PaymentMethodDto getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethodDto paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }
}
