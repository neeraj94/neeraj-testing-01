package com.example.rbac.admin.brands.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.brands.dto.BrandDto;
import com.example.rbac.admin.brands.dto.BrandRequest;
import com.example.rbac.admin.brands.dto.PublicBrandDto;
import com.example.rbac.admin.brands.mapper.BrandMapper;
import com.example.rbac.admin.brands.model.Brand;
import com.example.rbac.admin.brands.repository.BrandRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BrandService {

    private final BrandRepository brandRepository;
    private final BrandMapper brandMapper;
    private final ActivityRecorder activityRecorder;
    private final BrandLogoStorageService logoStorageService;

    public BrandService(BrandRepository brandRepository,
                        BrandMapper brandMapper,
                        ActivityRecorder activityRecorder,
                        BrandLogoStorageService logoStorageService) {
        this.brandRepository = brandRepository;
        this.brandMapper = brandMapper;
        this.activityRecorder = activityRecorder;
        this.logoStorageService = logoStorageService;
    }

    public PageResponse<BrandDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<Brand> result;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            result = brandRepository.findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(term, term, pageable);
        } else {
            result = brandRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(this::mapToDto));
    }

    public List<PublicBrandDto> listPublicBrands() {
        return brandRepository.findAllByOrderByNameAsc()
                .stream()
                .map(brandMapper::toPublicDto)
                .peek(dto -> dto.setLogoUrl(logoStorageService.resolvePublicUrl(dto.getLogoUrl())))
                .collect(Collectors.toList());
    }

    public BrandDto get(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Brand not found"));
        return mapToDto(brand);
    }

    @Transactional
    public BrandDto create(BrandRequest request) {
        Brand brand = new Brand();
        applyRequest(brand, request);
        ensureUniqueSlug(brand.getSlug(), null);
        Brand saved = brandRepository.save(brand);
        activityRecorder.record("Catalog", "BRAND_CREATED", "Created brand " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public BrandDto update(Long id, BrandRequest request) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Brand not found"));
        String previousSlug = brand.getSlug();
        applyRequest(brand, request);
        ensureUniqueSlug(brand.getSlug(), brand.getId());
        Brand saved = brandRepository.save(brand);
        activityRecorder.record("Catalog", "BRAND_UPDATED", "Updated brand " + saved.getName(), "SUCCESS", buildContext(saved));
        if (previousSlug != null && !previousSlug.equalsIgnoreCase(saved.getSlug())) {
            Map<String, Object> context = new HashMap<>();
            context.put("brandId", saved.getId());
            context.put("previousSlug", previousSlug);
            context.put("newSlug", saved.getSlug());
            activityRecorder.record("Catalog", "BRAND_SLUG_CHANGED", "Brand slug updated", "SUCCESS", context);
        }
        return mapToDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Brand not found"));
        brandRepository.delete(brand);
        activityRecorder.record("Catalog", "BRAND_DELETED", "Deleted brand " + brand.getName(), "SUCCESS", buildContext(brand));
    }

    private void applyRequest(Brand brand, BrandRequest request) {
        brand.setName(request.getName().trim());
        brand.setSlug(normalizeSlug(request.getSlug(), request.getName()));
        brand.setDescription(trimToNull(request.getDescription()));
        brand.setLogoUrl(logoStorageService.resolvePublicUrl(trimToNull(request.getLogoUrl())));
        brand.setMetaTitle(trimToNull(request.getMetaTitle()));
        brand.setMetaDescription(trimToNull(request.getMetaDescription()));
        brand.setMetaKeywords(trimToNull(request.getMetaKeywords()));
        brand.setMetaCanonicalUrl(trimToNull(request.getMetaCanonicalUrl()));
        brand.setMetaRobots(trimToNull(request.getMetaRobots()));
        brand.setMetaOgTitle(trimToNull(request.getMetaOgTitle()));
        brand.setMetaOgDescription(trimToNull(request.getMetaOgDescription()));
        brand.setMetaOgImage(trimToNull(request.getMetaOgImage()));
    }

    private void ensureUniqueSlug(String slug, Long brandId) {
        if (!StringUtils.hasText(slug)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Brand slug is required");
        }
        boolean exists = brandId == null
                ? brandRepository.existsBySlugIgnoreCase(slug)
                : brandRepository.existsBySlugIgnoreCaseAndIdNot(slug, brandId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Brand slug already exists");
        }
    }

    private String normalizeSlug(String slug, String fallback) {
        String candidate = Optional.ofNullable(slug)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .orElseGet(() -> Optional.ofNullable(fallback).map(String::trim).orElse(null));
        if (!StringUtils.hasText(candidate)) {
            candidate = "brand-" + Long.toHexString(System.nanoTime());
        }
        String sanitized = candidate.toLowerCase()
                .replaceAll("[^a-z0-9\\s-_]", "")
                .replaceAll("[\\s-_]+", "-");
        if (!StringUtils.hasText(sanitized)) {
            sanitized = "brand-" + Long.toHexString(System.nanoTime());
        }
        return sanitized.length() > 160 ? sanitized.substring(0, 160) : sanitized;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Map<String, Object> buildContext(Brand brand) {
        Map<String, Object> context = new HashMap<>();
        context.put("brandId", brand.getId());
        context.put("brandName", brand.getName());
        context.put("brandSlug", brand.getSlug());
        return context;
    }

    private BrandDto mapToDto(Brand brand) {
        BrandDto dto = brandMapper.toDto(brand);
        dto.setLogoUrl(logoStorageService.resolvePublicUrl(dto.getLogoUrl()));
        return dto;
    }
}
