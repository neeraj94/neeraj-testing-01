package com.example.rbac.products.dto.storefront;

import java.util.List;

public class PublicProductSearchFiltersDto {

    private List<PublicProductFilterValueDto> categories;

    private List<PublicProductFilterValueDto> brands;

    private PublicProductPriceRangeDto priceRange;

    public List<PublicProductFilterValueDto> getCategories() {
        return categories;
    }

    public void setCategories(List<PublicProductFilterValueDto> categories) {
        this.categories = categories;
    }

    public List<PublicProductFilterValueDto> getBrands() {
        return brands;
    }

    public void setBrands(List<PublicProductFilterValueDto> brands) {
        this.brands = brands;
    }

    public PublicProductPriceRangeDto getPriceRange() {
        return priceRange;
    }

    public void setPriceRange(PublicProductPriceRangeDto priceRange) {
        this.priceRange = priceRange;
    }
}
