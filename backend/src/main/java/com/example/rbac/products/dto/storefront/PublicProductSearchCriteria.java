package com.example.rbac.products.dto.storefront;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class PublicProductSearchCriteria {

    private List<String> categorySlugs = new ArrayList<>();

    private List<String> brandSlugs = new ArrayList<>();

    private BigDecimal minimumPrice;

    private BigDecimal maximumPrice;

    private Integer minimumRating;

    private PublicProductAvailability availability;

    private PublicProductSort sort = PublicProductSort.NEWEST;

    private int page = 0;

    private int size = 12;

    public List<String> getCategorySlugs() {
        return categorySlugs;
    }

    public void setCategorySlugs(List<String> categorySlugs) {
        this.categorySlugs = categorySlugs;
    }

    public List<String> getBrandSlugs() {
        return brandSlugs;
    }

    public void setBrandSlugs(List<String> brandSlugs) {
        this.brandSlugs = brandSlugs;
    }

    public BigDecimal getMinimumPrice() {
        return minimumPrice;
    }

    public void setMinimumPrice(BigDecimal minimumPrice) {
        this.minimumPrice = minimumPrice;
    }

    public BigDecimal getMaximumPrice() {
        return maximumPrice;
    }

    public void setMaximumPrice(BigDecimal maximumPrice) {
        this.maximumPrice = maximumPrice;
    }

    public Integer getMinimumRating() {
        return minimumRating;
    }

    public void setMinimumRating(Integer minimumRating) {
        this.minimumRating = minimumRating;
    }

    public PublicProductAvailability getAvailability() {
        return availability;
    }

    public void setAvailability(PublicProductAvailability availability) {
        this.availability = availability;
    }

    public PublicProductSort getSort() {
        return sort;
    }

    public void setSort(PublicProductSort sort) {
        this.sort = sort;
    }

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
}
