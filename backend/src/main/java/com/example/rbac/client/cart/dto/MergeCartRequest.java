package com.example.rbac.client.cart.dto;

import jakarta.validation.Valid;

import java.util.ArrayList;
import java.util.List;

public class MergeCartRequest {

    @Valid
    private List<GuestCartLineRequest> items = new ArrayList<>();

    public List<GuestCartLineRequest> getItems() {
        return items;
    }

    public void setItems(List<GuestCartLineRequest> items) {
        this.items = items;
    }
}
