package com.example.rbac.products.dto.storefront;

import java.math.BigDecimal;

public class PublicProductPriceRangeDto {

    private BigDecimal minimum;

    private BigDecimal maximum;

    public BigDecimal getMinimum() {
        return minimum;
    }

    public void setMinimum(BigDecimal minimum) {
        this.minimum = minimum;
    }

    public BigDecimal getMaximum() {
        return maximum;
    }

    public void setMaximum(BigDecimal maximum) {
        this.maximum = maximum;
    }
}
