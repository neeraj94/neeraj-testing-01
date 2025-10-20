package com.example.rbac.admin.checkout.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class OrderDetailDto {

    private Long id;
    private String orderNumber;
    private String status;
    private Instant createdAt;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private CheckoutAddressDto shippingAddress;
    private CheckoutAddressDto billingAddress;
    private PaymentMethodDto paymentMethod;
    private OrderSummaryDto summary;
    private List<OrderLineDto> lines = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
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

    public OrderSummaryDto getSummary() {
        return summary;
    }

    public void setSummary(OrderSummaryDto summary) {
        this.summary = summary;
    }

    public List<OrderLineDto> getLines() {
        return lines;
    }

    public void setLines(List<OrderLineDto> lines) {
        this.lines = lines;
    }
}
