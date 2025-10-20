package com.example.rbac.admin.checkout.dto;

public class CheckoutAddressRequest {

    private CheckoutAddressType type;
    private Long countryId;
    private Long stateId;
    private Long cityId;
    private String fullName;
    private String mobileNumber;
    private String pinCode;
    private String addressLine1;
    private String addressLine2;
    private String landmark;
    private Boolean makeDefault;

    public CheckoutAddressType getType() {
        return type;
    }

    public void setType(CheckoutAddressType type) {
        this.type = type;
    }

    public Long getCountryId() {
        return countryId;
    }

    public void setCountryId(Long countryId) {
        this.countryId = countryId;
    }

    public Long getStateId() {
        return stateId;
    }

    public void setStateId(Long stateId) {
        this.stateId = stateId;
    }

    public Long getCityId() {
        return cityId;
    }

    public void setCityId(Long cityId) {
        this.cityId = cityId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getPinCode() {
        return pinCode;
    }

    public void setPinCode(String pinCode) {
        this.pinCode = pinCode;
    }

    public String getAddressLine1() {
        return addressLine1;
    }

    public void setAddressLine1(String addressLine1) {
        this.addressLine1 = addressLine1;
    }

    public String getAddressLine2() {
        return addressLine2;
    }

    public void setAddressLine2(String addressLine2) {
        this.addressLine2 = addressLine2;
    }

    public String getLandmark() {
        return landmark;
    }

    public void setLandmark(String landmark) {
        this.landmark = landmark;
    }

    public Boolean getMakeDefault() {
        return makeDefault;
    }

    public void setMakeDefault(Boolean makeDefault) {
        this.makeDefault = makeDefault;
    }
}
