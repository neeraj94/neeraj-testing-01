package com.example.rbac.admin.checkout.dto;

import com.example.rbac.client.checkout.dto.CheckoutAddressDto;
import com.example.rbac.client.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.client.checkout.dto.OrderSummaryDto;
import com.example.rbac.client.checkout.dto.PaymentMethodDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

/**
 * Request payload used by admin users to create or update orders.
 */
public class AdminOrderRequest {

    @NotNull
    private Long customerId;

    @Size(max = 255)
    private String customerEmail;

    @Size(max = 255)
    private String customerName;

    @Size(max = 40)
    private String status;

    private CheckoutAddressDto shippingAddress;

    private CheckoutAddressDto billingAddress;

    private PaymentMethodDto paymentMethod;

    private OrderSummaryDto summary;

    @NotEmpty
    @Valid
    private List<CheckoutOrderLineRequest> lines = new ArrayList<>();

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public List<CheckoutOrderLineRequest> getLines() {
        return lines;
    }

    public void setLines(List<CheckoutOrderLineRequest> lines) {
        this.lines = lines;
    }
}
