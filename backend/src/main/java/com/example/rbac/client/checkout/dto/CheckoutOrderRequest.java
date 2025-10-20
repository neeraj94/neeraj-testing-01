package com.example.rbac.client.checkout.dto;

import java.util.ArrayList;
import java.util.List;

public class CheckoutOrderRequest {

    private Long shippingAddressId;
    private Long billingAddressId;
    private boolean sameAsShipping;
    private String paymentMethodKey;
    private List<CheckoutOrderLineRequest> lines = new ArrayList<>();
    private String couponCode;

    public Long getShippingAddressId() {
        return shippingAddressId;
    }

    public void setShippingAddressId(Long shippingAddressId) {
        this.shippingAddressId = shippingAddressId;
    }

    public Long getBillingAddressId() {
        return billingAddressId;
    }

    public void setBillingAddressId(Long billingAddressId) {
        this.billingAddressId = billingAddressId;
    }

    public boolean isSameAsShipping() {
        return sameAsShipping;
    }

    public void setSameAsShipping(boolean sameAsShipping) {
        this.sameAsShipping = sameAsShipping;
    }

    public String getPaymentMethodKey() {
        return paymentMethodKey;
    }

    public void setPaymentMethodKey(String paymentMethodKey) {
        this.paymentMethodKey = paymentMethodKey;
    }

    public List<CheckoutOrderLineRequest> getLines() {
        return lines;
    }

    public void setLines(List<CheckoutOrderLineRequest> lines) {
        this.lines = lines;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }
}
