package com.example.rbac.admin.checkout.dto;

import com.example.rbac.client.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.client.checkout.dto.OrderSummaryDto;

import java.util.ArrayList;
import java.util.List;

public class AdminOrderPreviewResponse {

    private OrderSummaryDto summary;
    private final List<CheckoutOrderLineRequest> lines = new ArrayList<>();

    public OrderSummaryDto getSummary() {
        return summary;
    }

    public void setSummary(OrderSummaryDto summary) {
        this.summary = summary;
    }

    public List<CheckoutOrderLineRequest> getLines() {
        return lines;
    }
}
