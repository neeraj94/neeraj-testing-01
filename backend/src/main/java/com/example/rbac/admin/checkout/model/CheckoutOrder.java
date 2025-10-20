package com.example.rbac.admin.checkout.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "checkout_orders")
public class CheckoutOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", length = 64, unique = true)
    private String orderNumber;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "status", length = 40)
    private String status;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "summary_json", columnDefinition = "LONGTEXT")
    private String summaryJson;

    @Column(name = "shipping_address_json", columnDefinition = "LONGTEXT")
    private String shippingAddressJson;

    @Column(name = "billing_address_json", columnDefinition = "LONGTEXT")
    private String billingAddressJson;

    @Column(name = "payment_method_json", columnDefinition = "LONGTEXT")
    private String paymentMethodJson;

    @Column(name = "lines_json", columnDefinition = "LONGTEXT")
    private String linesJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    private void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    private void onUpdate() {
        this.updatedAt = Instant.now();
    }

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

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public String getSummaryJson() {
        return summaryJson;
    }

    public void setSummaryJson(String summaryJson) {
        this.summaryJson = summaryJson;
    }

    public String getShippingAddressJson() {
        return shippingAddressJson;
    }

    public void setShippingAddressJson(String shippingAddressJson) {
        this.shippingAddressJson = shippingAddressJson;
    }

    public String getBillingAddressJson() {
        return billingAddressJson;
    }

    public void setBillingAddressJson(String billingAddressJson) {
        this.billingAddressJson = billingAddressJson;
    }

    public String getPaymentMethodJson() {
        return paymentMethodJson;
    }

    public void setPaymentMethodJson(String paymentMethodJson) {
        this.paymentMethodJson = paymentMethodJson;
    }

    public String getLinesJson() {
        return linesJson;
    }

    public void setLinesJson(String linesJson) {
        this.linesJson = linesJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

