package com.example.rbac.checkout.dto;

import java.time.Instant;

public class OrderSearchCriteria {

    private String search;
    private String status;
    private String paymentMethod;
    private Instant placedFrom;
    private Instant placedTo;
    private String sort;
    private String direction;
    private int page = 0;
    private int size = 20;

    public String getSearch() {
        return search;
    }

    public void setSearch(String search) {
        this.search = search;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Instant getPlacedFrom() {
        return placedFrom;
    }

    public void setPlacedFrom(Instant placedFrom) {
        this.placedFrom = placedFrom;
    }

    public Instant getPlacedTo() {
        return placedTo;
    }

    public void setPlacedTo(Instant placedTo) {
        this.placedTo = placedTo;
    }

    public String getSort() {
        return sort;
    }

    public void setSort(String sort) {
        this.sort = sort;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = Math.max(page, 0);
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        if (size < 1) {
            this.size = 1;
        } else if (size > 100) {
            this.size = 100;
        } else {
            this.size = size;
        }
    }
}
