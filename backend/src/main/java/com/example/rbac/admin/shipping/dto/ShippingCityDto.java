package com.example.rbac.admin.shipping.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class ShippingCityDto {
    private Long id;
    private Long stateId;
    private Long countryId;
    private String name;
    private boolean enabled;
    private BigDecimal overrideCost;
    private BigDecimal effectiveCost;
    private BigDecimal inheritedCost;
    private Instant createdAt;
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStateId() {
        return stateId;
    }

    public void setStateId(Long stateId) {
        this.stateId = stateId;
    }

    public Long getCountryId() {
        return countryId;
    }

    public void setCountryId(Long countryId) {
        this.countryId = countryId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public BigDecimal getOverrideCost() {
        return overrideCost;
    }

    public void setOverrideCost(BigDecimal overrideCost) {
        this.overrideCost = overrideCost;
    }

    public BigDecimal getEffectiveCost() {
        return effectiveCost;
    }

    public void setEffectiveCost(BigDecimal effectiveCost) {
        this.effectiveCost = effectiveCost;
    }

    public BigDecimal getInheritedCost() {
        return inheritedCost;
    }

    public void setInheritedCost(BigDecimal inheritedCost) {
        this.inheritedCost = inheritedCost;
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
