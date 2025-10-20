package com.example.rbac.admin.brands.mapper;

import com.example.rbac.admin.brands.dto.BrandDto;
import com.example.rbac.admin.brands.dto.PublicBrandDto;
import com.example.rbac.admin.brands.model.Brand;
import org.springframework.stereotype.Component;

@Component
public class BrandMapper {

    public BrandDto toDto(Brand brand) {
        if (brand == null) {
            return null;
        }
        BrandDto dto = new BrandDto();
        dto.setId(brand.getId());
        dto.setName(brand.getName());
        dto.setSlug(brand.getSlug());
        dto.setDescription(brand.getDescription());
        dto.setLogoUrl(brand.getLogoUrl());
        dto.setMetaTitle(brand.getMetaTitle());
        dto.setMetaDescription(brand.getMetaDescription());
        dto.setMetaKeywords(brand.getMetaKeywords());
        dto.setMetaCanonicalUrl(brand.getMetaCanonicalUrl());
        dto.setMetaRobots(brand.getMetaRobots());
        dto.setMetaOgTitle(brand.getMetaOgTitle());
        dto.setMetaOgDescription(brand.getMetaOgDescription());
        dto.setMetaOgImage(brand.getMetaOgImage());
        dto.setCreatedAt(brand.getCreatedAt());
        dto.setUpdatedAt(brand.getUpdatedAt());
        return dto;
    }

    public PublicBrandDto toPublicDto(Brand brand) {
        if (brand == null) {
            return null;
        }
        PublicBrandDto dto = new PublicBrandDto();
        dto.setId(brand.getId());
        dto.setName(brand.getName());
        dto.setSlug(brand.getSlug());
        dto.setDescription(brand.getDescription());
        dto.setLogoUrl(brand.getLogoUrl());
        return dto;
    }
}
