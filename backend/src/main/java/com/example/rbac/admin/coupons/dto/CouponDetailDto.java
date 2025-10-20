package com.example.rbac.admin.coupons.dto;

import java.util.List;

public class CouponDetailDto extends CouponSummaryDto {

    private List<CouponProductDto> products;
    private List<CouponCategoryDto> categories;
    private List<CouponUserDto> users;

    public List<CouponProductDto> getProducts() {
        return products;
    }

    public void setProducts(List<CouponProductDto> products) {
        this.products = products;
    }

    public List<CouponCategoryDto> getCategories() {
        return categories;
    }

    public void setCategories(List<CouponCategoryDto> categories) {
        this.categories = categories;
    }

    public List<CouponUserDto> getUsers() {
        return users;
    }

    public void setUsers(List<CouponUserDto> users) {
        this.users = users;
    }
}
