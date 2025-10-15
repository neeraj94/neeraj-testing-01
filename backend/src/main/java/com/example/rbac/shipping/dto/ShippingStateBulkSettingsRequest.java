package com.example.rbac.shipping.dto;

import java.math.BigDecimal;
import java.util.List;

public class ShippingStateBulkSettingsRequest {

    private List<Long> ids;
    private Boolean enabled;
    private BigDecimal overrideCost;
    private Boolean clearOverride;

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public BigDecimal getOverrideCost() {
        return overrideCost;
    }

    public void setOverrideCost(BigDecimal overrideCost) {
        this.overrideCost = overrideCost;
    }

    public Boolean getClearOverride() {
        return clearOverride;
    }

    public void setClearOverride(Boolean clearOverride) {
        this.clearOverride = clearOverride;
    }
}
