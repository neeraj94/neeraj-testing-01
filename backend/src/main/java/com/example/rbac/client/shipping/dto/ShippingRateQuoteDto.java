package com.example.rbac.client.shipping.dto;

import java.math.BigDecimal;

public class ShippingRateQuoteDto {

    private Long countryId;
    private String countryName;
    private BigDecimal countryCost;
    private Long stateId;
    private String stateName;
    private BigDecimal stateCost;
    private Long cityId;
    private String cityName;
    private BigDecimal cityCost;
    private BigDecimal effectiveCost;

    public Long getCountryId() {
        return countryId;
    }

    public void setCountryId(Long countryId) {
        this.countryId = countryId;
    }

    public String getCountryName() {
        return countryName;
    }

    public void setCountryName(String countryName) {
        this.countryName = countryName;
    }

    public BigDecimal getCountryCost() {
        return countryCost;
    }

    public void setCountryCost(BigDecimal countryCost) {
        this.countryCost = countryCost;
    }

    public Long getStateId() {
        return stateId;
    }

    public void setStateId(Long stateId) {
        this.stateId = stateId;
    }

    public String getStateName() {
        return stateName;
    }

    public void setStateName(String stateName) {
        this.stateName = stateName;
    }

    public BigDecimal getStateCost() {
        return stateCost;
    }

    public void setStateCost(BigDecimal stateCost) {
        this.stateCost = stateCost;
    }

    public Long getCityId() {
        return cityId;
    }

    public void setCityId(Long cityId) {
        this.cityId = cityId;
    }

    public String getCityName() {
        return cityName;
    }

    public void setCityName(String cityName) {
        this.cityName = cityName;
    }

    public BigDecimal getCityCost() {
        return cityCost;
    }

    public void setCityCost(BigDecimal cityCost) {
        this.cityCost = cityCost;
    }

    public BigDecimal getEffectiveCost() {
        return effectiveCost;
    }

    public void setEffectiveCost(BigDecimal effectiveCost) {
        this.effectiveCost = effectiveCost;
    }
}
