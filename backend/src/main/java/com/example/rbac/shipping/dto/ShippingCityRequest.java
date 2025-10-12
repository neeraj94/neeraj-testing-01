package com.example.rbac.shipping.dto;

public class ShippingCityRequest {
    private Long stateId;
    private String name;

    public Long getStateId() {
        return stateId;
    }

    public void setStateId(Long stateId) {
        this.stateId = stateId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
