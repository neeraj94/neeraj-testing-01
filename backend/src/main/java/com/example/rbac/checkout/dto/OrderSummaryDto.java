package com.example.rbac.checkout.dto;

import com.example.rbac.shipping.dto.ShippingRateQuoteDto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class OrderSummaryDto {

    private BigDecimal productTotal;
    private BigDecimal taxTotal;
    private BigDecimal shippingTotal;
    private BigDecimal grandTotal;
    private BigDecimal discountTotal;
    private ShippingRateQuoteDto shippingBreakdown;
    private List<OrderTaxLineDto> taxLines = new ArrayList<>();
    private AppliedCouponDto appliedCoupon;

    public BigDecimal getProductTotal() {
        return productTotal;
    }

    public void setProductTotal(BigDecimal productTotal) {
        this.productTotal = productTotal;
    }

    public BigDecimal getTaxTotal() {
        return taxTotal;
    }

    public void setTaxTotal(BigDecimal taxTotal) {
        this.taxTotal = taxTotal;
    }

    public BigDecimal getShippingTotal() {
        return shippingTotal;
    }

    public void setShippingTotal(BigDecimal shippingTotal) {
        this.shippingTotal = shippingTotal;
    }

    public BigDecimal getGrandTotal() {
        return grandTotal;
    }

    public void setGrandTotal(BigDecimal grandTotal) {
        this.grandTotal = grandTotal;
    }

    public BigDecimal getDiscountTotal() {
        return discountTotal;
    }

    public void setDiscountTotal(BigDecimal discountTotal) {
        this.discountTotal = discountTotal;
    }

    public ShippingRateQuoteDto getShippingBreakdown() {
        return shippingBreakdown;
    }

    public void setShippingBreakdown(ShippingRateQuoteDto shippingBreakdown) {
        this.shippingBreakdown = shippingBreakdown;
    }

    public List<OrderTaxLineDto> getTaxLines() {
        return taxLines;
    }

    public void setTaxLines(List<OrderTaxLineDto> taxLines) {
        this.taxLines = taxLines;
    }

    public AppliedCouponDto getAppliedCoupon() {
        return appliedCoupon;
    }

    public void setAppliedCoupon(AppliedCouponDto appliedCoupon) {
        this.appliedCoupon = appliedCoupon;
    }
}
