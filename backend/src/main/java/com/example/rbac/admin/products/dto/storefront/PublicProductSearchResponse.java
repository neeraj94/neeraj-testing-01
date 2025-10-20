package com.example.rbac.admin.products.dto.storefront;

import java.util.List;

public class PublicProductSearchResponse {

    private int page;

    private int size;

    private long totalElements;

    private int totalPages;

    private boolean hasNext;

    private List<PublicProductListItemDto> items;

    private PublicProductSearchFiltersDto filters;

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public void setHasNext(boolean hasNext) {
        this.hasNext = hasNext;
    }

    public List<PublicProductListItemDto> getItems() {
        return items;
    }

    public void setItems(List<PublicProductListItemDto> items) {
        this.items = items;
    }

    public PublicProductSearchFiltersDto getFilters() {
        return filters;
    }

    public void setFilters(PublicProductSearchFiltersDto filters) {
        this.filters = filters;
    }
}
