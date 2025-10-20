package com.example.rbac.client.checkout.dto;

import java.util.ArrayList;
import java.util.List;

public class CheckoutSummaryDto {

    private List<CheckoutAddressDto> addresses = new ArrayList<>();
    private List<PaymentMethodDto> paymentMethods = new ArrayList<>();
    private List<CheckoutCouponDto> coupons = new ArrayList<>();
    private OrderSummaryDto orderSummary;

    public List<CheckoutAddressDto> getAddresses() {
        return addresses;
    }

    public void setAddresses(List<CheckoutAddressDto> addresses) {
        this.addresses = addresses;
    }

    public List<PaymentMethodDto> getPaymentMethods() {
        return paymentMethods;
    }

    public void setPaymentMethods(List<PaymentMethodDto> paymentMethods) {
        this.paymentMethods = paymentMethods;
    }

    public List<CheckoutCouponDto> getCoupons() {
        return coupons;
    }

    public void setCoupons(List<CheckoutCouponDto> coupons) {
        this.coupons = coupons;
    }

    public OrderSummaryDto getOrderSummary() {
        return orderSummary;
    }

    public void setOrderSummary(OrderSummaryDto orderSummary) {
        this.orderSummary = orderSummary;
    }
}
