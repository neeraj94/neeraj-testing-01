package com.example.rbac.coupons.mapper;

import com.example.rbac.categories.model.Category;
import com.example.rbac.coupons.dto.*;
import com.example.rbac.coupons.model.Coupon;
import com.example.rbac.products.model.Product;
import com.example.rbac.users.model.User;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class CouponMapper {

    public CouponSummaryDto toSummary(Coupon coupon) {
        if (coupon == null) {
            return null;
        }
        CouponSummaryDto dto = new CouponSummaryDto();
        dto.setId(coupon.getId());
        dto.setType(coupon.getType());
        dto.setName(coupon.getName());
        dto.setCode(coupon.getCode());
        dto.setShortDescription(coupon.getShortDescription());
        dto.setLongDescription(coupon.getLongDescription());
        dto.setDiscountType(coupon.getDiscountType());
        dto.setDiscountValue(coupon.getDiscountValue());
        dto.setMinimumCartValue(coupon.getMinimumCartValue());
        dto.setStartDate(coupon.getStartDate());
        dto.setEndDate(coupon.getEndDate());
        dto.setStatus(coupon.getStatus());
        dto.setState(resolveState(coupon));
        dto.setImageUrl(coupon.getImageUrl());
        dto.setApplyToAllNewUsers(coupon.isApplyToAllNewUsers());
        dto.setCreatedAt(coupon.getCreatedAt());
        dto.setUpdatedAt(coupon.getUpdatedAt());
        dto.setProductCount(sizeOrNull(coupon.getProducts()));
        dto.setCategoryCount(sizeOrNull(coupon.getCategories()));
        dto.setUserCount(sizeOrNull(coupon.getUsers()));
        return dto;
    }

    public CouponDetailDto toDetail(Coupon coupon) {
        CouponSummaryDto summary = toSummary(coupon);
        CouponDetailDto detail = new CouponDetailDto();
        if (summary != null) {
            detail.setId(summary.getId());
            detail.setType(summary.getType());
            detail.setName(summary.getName());
            detail.setCode(summary.getCode());
            detail.setShortDescription(summary.getShortDescription());
            detail.setLongDescription(summary.getLongDescription());
            detail.setDiscountType(summary.getDiscountType());
            detail.setDiscountValue(summary.getDiscountValue());
            detail.setMinimumCartValue(summary.getMinimumCartValue());
            detail.setStartDate(summary.getStartDate());
            detail.setEndDate(summary.getEndDate());
            detail.setStatus(summary.getStatus());
            detail.setState(summary.getState());
            detail.setImageUrl(summary.getImageUrl());
            detail.setApplyToAllNewUsers(summary.isApplyToAllNewUsers());
            detail.setCreatedAt(summary.getCreatedAt());
            detail.setUpdatedAt(summary.getUpdatedAt());
            detail.setProductCount(summary.getProductCount());
            detail.setCategoryCount(summary.getCategoryCount());
            detail.setUserCount(summary.getUserCount());
        }
        detail.setProducts(mapProducts(coupon.getProducts()));
        detail.setCategories(mapCategories(coupon.getCategories()));
        detail.setUsers(mapUsers(coupon.getUsers()));
        return detail;
    }

    public PublicCouponDto toPublicSummary(Coupon coupon) {
        if (coupon == null) {
            return null;
        }
        PublicCouponDto dto = new PublicCouponDto();
        dto.setId(coupon.getId());
        dto.setType(coupon.getType());
        dto.setName(coupon.getName());
        dto.setCode(coupon.getCode());
        dto.setShortDescription(coupon.getShortDescription());
        dto.setLongDescription(coupon.getLongDescription());
        dto.setDiscountType(coupon.getDiscountType());
        dto.setDiscountValue(coupon.getDiscountValue());
        dto.setMinimumCartValue(coupon.getMinimumCartValue());
        dto.setStartDate(coupon.getStartDate());
        dto.setEndDate(coupon.getEndDate());
        dto.setImageUrl(coupon.getImageUrl());
        dto.setApplyToAllNewUsers(coupon.isApplyToAllNewUsers());
        dto.setProducts(limitList(mapProducts(coupon.getProducts()), 6));
        dto.setCategories(limitList(mapCategories(coupon.getCategories()), 6));
        return dto;
    }

    private List<CouponProductDto> mapProducts(Set<Product> products) {
        List<CouponProductDto> result = new ArrayList<>();
        if (products == null) {
            return result;
        }
        for (Product product : products) {
            if (product == null) {
                continue;
            }
            CouponProductDto dto = new CouponProductDto();
            dto.setId(product.getId());
            dto.setName(product.getName());
            dto.setSku(product.getSku());
            dto.setImageUrl(product.getThumbnail() != null ? product.getThumbnail().getUrl() : null);
            result.add(dto);
        }
        return result;
    }

    private List<CouponCategoryDto> mapCategories(Set<Category> categories) {
        List<CouponCategoryDto> result = new ArrayList<>();
        if (categories == null) {
            return result;
        }
        for (Category category : categories) {
            if (category == null) {
                continue;
            }
            CouponCategoryDto dto = new CouponCategoryDto();
            dto.setId(category.getId());
            dto.setName(category.getName());
            dto.setImageUrl(category.getIconUrl());
            result.add(dto);
        }
        return result;
    }

    private List<CouponUserDto> mapUsers(Set<User> users) {
        List<CouponUserDto> result = new ArrayList<>();
        if (users == null) {
            return result;
        }
        for (User user : users) {
            if (user == null) {
                continue;
            }
            CouponUserDto dto = new CouponUserDto();
            dto.setId(user.getId());
            dto.setName(user.getFullName());
            dto.setEmail(user.getEmail());
            dto.setAvatarUrl(user.getProfileImageUrl());
            result.add(dto);
        }
        return result;
    }

    private CouponState resolveState(Coupon coupon) {
        if (coupon == null) {
            return CouponState.DISABLED;
        }
        if (coupon.getStatus() == null) {
            return CouponState.DISABLED;
        }
        if (coupon.getStatus() == com.example.rbac.coupons.model.CouponStatus.DISABLED) {
            return CouponState.DISABLED;
        }
        Instant endDate = coupon.getEndDate();
        if (endDate != null && endDate.isBefore(Instant.now())) {
            return CouponState.EXPIRED;
        }
        return CouponState.ENABLED;
    }

    private <T> List<T> limitList(List<T> source, int max) {
        if (source == null) {
            return new ArrayList<>();
        }
        if (source.size() <= max) {
            return source;
        }
        return new ArrayList<>(source.subList(0, max));
    }

    private Integer sizeOrNull(Set<?> set) {
        if (set == null) {
            return 0;
        }
        return set.size();
    }
}
