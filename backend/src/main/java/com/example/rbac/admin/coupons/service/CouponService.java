package com.example.rbac.admin.coupons.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.categories.model.Category;
import com.example.rbac.admin.categories.repository.CategoryRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.coupons.dto.*;
import com.example.rbac.admin.coupons.mapper.CouponMapper;
import com.example.rbac.admin.coupons.model.Coupon;
import com.example.rbac.admin.coupons.model.CouponStatus;
import com.example.rbac.admin.coupons.model.CouponType;
import com.example.rbac.admin.coupons.repository.CouponRepository;
import com.example.rbac.admin.products.model.DiscountType;
import com.example.rbac.admin.products.model.Product;
import com.example.rbac.admin.products.repository.ProductRepository;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ActivityRecorder activityRecorder;
    private final CouponMapper couponMapper = new CouponMapper();

    public CouponService(CouponRepository couponRepository,
                         ProductRepository productRepository,
                         CategoryRepository categoryRepository,
                         UserRepository userRepository,
                         ActivityRecorder activityRecorder) {
        this.couponRepository = couponRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public PageResponse<CouponSummaryDto> list(int page,
                                               int size,
                                               CouponType type,
                                               CouponState state,
                                               DiscountType discountType,
                                               String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Coupon> specification = Specification.where(null);
        if (type != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("type"), type));
        }
        if (discountType != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("discountType"), discountType));
        }
        if (StringUtils.hasText(search)) {
            String term = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            specification = specification.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), term),
                    cb.like(cb.lower(root.get("code")), term)
            ));
        }
        if (state != null) {
            specification = specification.and(buildStateSpecification(state));
        }
        Page<Coupon> result = couponRepository.findAll(specification, pageable);
        return PageResponse.from(result.map(couponMapper::toSummary));
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicCouponDto> listPublic(int page, int size, CouponType type, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));
        Instant now = Instant.now();
        Specification<Coupon> specification = Specification.where((root, query, cb) -> cb.and(
                cb.equal(root.get("status"), CouponStatus.ENABLED),
                cb.lessThanOrEqualTo(root.get("startDate"), now),
                cb.greaterThanOrEqualTo(root.get("endDate"), now)
        ));
        if (type != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("type"), type));
        }
        if (StringUtils.hasText(search)) {
            String term = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            specification = specification.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), term),
                    cb.like(cb.lower(root.get("code")), term)
            ));
        }
        Page<Coupon> result = couponRepository.findAll(specification, pageable);
        return PageResponse.from(result.map(couponMapper::toPublicSummary));
    }

    @Transactional(readOnly = true)
    public CouponDetailDto get(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon not found"));
        return couponMapper.toDetail(coupon);
    }

    @Transactional
    public CouponDetailDto create(CouponRequest request) {
        Coupon coupon = new Coupon();
        applyRequest(coupon, request);
        ensureUniqueCode(coupon.getCode(), null);
        Coupon saved = couponRepository.save(coupon);
        activityRecorder.record("Catalog", "COUPON_CREATED", "Created coupon " + saved.getCode(), "SUCCESS", buildContext(saved));
        return couponMapper.toDetail(saved);
    }

    @Transactional
    public CouponDetailDto update(Long id, CouponRequest request) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon not found"));
        applyRequest(coupon, request);
        ensureUniqueCode(coupon.getCode(), coupon.getId());
        Coupon saved = couponRepository.save(coupon);
        activityRecorder.record("Catalog", "COUPON_UPDATED", "Updated coupon " + saved.getCode(), "SUCCESS", buildContext(saved));
        return couponMapper.toDetail(saved);
    }

    @Transactional
    public void delete(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Coupon not found"));
        couponRepository.delete(coupon);
        activityRecorder.record("Catalog", "COUPON_DELETED", "Deleted coupon " + coupon.getCode(), "SUCCESS", buildContext(coupon));
    }

    @Transactional(readOnly = true)
    public List<CouponProductDto> findProductOptions(String search, int size) {
        Pageable pageable = PageRequest.of(0, Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<Product> page = StringUtils.hasText(search)
                ? productRepository.findByNameContainingIgnoreCase(search.trim(), pageable)
                : productRepository.findAll(pageable);
        List<CouponProductDto> options = new ArrayList<>();
        for (Product product : page.getContent()) {
            CouponProductDto dto = new CouponProductDto();
            dto.setId(product.getId());
            dto.setName(product.getName());
            dto.setSku(product.getSku());
            dto.setImageUrl(product.getThumbnail() != null ? product.getThumbnail().getUrl() : null);
            options.add(dto);
        }
        return options;
    }

    @Transactional(readOnly = true)
    public List<CouponCategoryDto> findCategoryOptions(String search, int size) {
        List<CouponCategoryDto> options = new ArrayList<>();
        Pageable pageable = PageRequest.of(0, Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<Category> page;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            page = categoryRepository.findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(term, term, pageable);
        } else {
            page = categoryRepository.findAll(pageable);
        }
        for (Category category : page.getContent()) {
            CouponCategoryDto dto = new CouponCategoryDto();
            dto.setId(category.getId());
            dto.setName(category.getName());
            dto.setImageUrl(category.getIconUrl());
            options.add(dto);
        }
        return options;
    }

    @Transactional(readOnly = true)
    public List<CouponUserDto> findUserOptions(String search, int size) {
        Pageable pageable = PageRequest.of(0, Math.max(size, 1), Sort.by(Sort.Direction.ASC, "fullName"));
        Page<User> page;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            page = userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(term, term, pageable);
        } else {
            page = userRepository.findAll(pageable);
        }
        List<CouponUserDto> options = new ArrayList<>();
        for (User user : page.getContent()) {
            CouponUserDto dto = new CouponUserDto();
            dto.setId(user.getId());
            dto.setName(user.getFullName());
            dto.setEmail(user.getEmail());
            dto.setAvatarUrl(user.getProfileImageUrl());
            options.add(dto);
        }
        return options;
    }

    private Specification<Coupon> buildStateSpecification(CouponState state) {
        Instant now = Instant.now();
        return (root, query, cb) -> {
            switch (state) {
                case DISABLED:
                    return cb.equal(root.get("status"), CouponStatus.DISABLED);
                case EXPIRED:
                    return cb.and(
                            cb.equal(root.get("status"), CouponStatus.ENABLED),
                            cb.lessThan(root.get("endDate"), now)
                    );
                case ENABLED:
                default:
                    return cb.and(
                            cb.equal(root.get("status"), CouponStatus.ENABLED),
                            cb.greaterThanOrEqualTo(root.get("endDate"), now)
                    );
            }
        };
    }

    private void applyRequest(Coupon coupon, CouponRequest request) {
        validateRequest(request);
        coupon.setType(request.getType());
        coupon.setName(request.getName().trim());
        coupon.setCode(request.getCode().trim());
        coupon.setShortDescription(trimToNull(request.getShortDescription()));
        coupon.setLongDescription(trimToNull(request.getLongDescription()));
        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue());
        if (request.getType() == CouponType.CART_VALUE) {
            coupon.setMinimumCartValue(request.getMinimumCartValue());
        } else {
            coupon.setMinimumCartValue(null);
        }
        coupon.setStartDate(request.getStartDate());
        coupon.setEndDate(request.getEndDate());
        coupon.setStatus(request.getStatus());
        coupon.setImageUrl(trimToNull(request.getImageUrl()));
        coupon.setApplyToAllNewUsers(request.getType() == CouponType.NEW_SIGNUP && Boolean.TRUE.equals(request.getApplyToAllNewUsers()));
        updateAssociations(coupon, request);
    }

    private void validateRequest(CouponRequest request) {
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon end date must be after start date");
        }
        if (request.getDiscountType() == DiscountType.PERCENTAGE) {
            BigDecimal value = request.getDiscountValue();
            if (value.compareTo(BigDecimal.ZERO) <= 0 || value.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Percentage discounts must be between 0 and 100");
            }
        }
        if (request.getType() == CouponType.CART_VALUE) {
            if (request.getMinimumCartValue() == null || request.getMinimumCartValue().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Minimum cart value is required for cart value coupons");
            }
        }
        if (request.getType() == CouponType.PRODUCT) {
            boolean hasProducts = request.getProductIds() != null && !request.getProductIds().isEmpty();
            boolean hasCategories = request.getCategoryIds() != null && !request.getCategoryIds().isEmpty();
            if (!hasProducts && !hasCategories) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one product or category");
            }
        }
        if (request.getType() == CouponType.NEW_SIGNUP) {
            boolean applyAll = Boolean.TRUE.equals(request.getApplyToAllNewUsers());
            boolean hasUsers = request.getUserIds() != null && !request.getUserIds().isEmpty();
            if (!applyAll && !hasUsers) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Select specific users or enable apply to all new users");
            }
        }
    }

    private void updateAssociations(Coupon coupon, CouponRequest request) {
        if (request.getType() == CouponType.PRODUCT) {
            updateProducts(coupon, request.getProductIds());
            updateCategories(coupon, request.getCategoryIds());
            coupon.getUsers().clear();
        } else if (request.getType() == CouponType.CART_VALUE) {
            coupon.getProducts().clear();
            coupon.getCategories().clear();
            coupon.getUsers().clear();
        } else if (request.getType() == CouponType.NEW_SIGNUP) {
            coupon.getProducts().clear();
            coupon.getCategories().clear();
            if (coupon.isApplyToAllNewUsers()) {
                coupon.getUsers().clear();
            } else {
                updateUsers(coupon, request.getUserIds());
            }
        }
    }

    private void updateProducts(Coupon coupon, List<Long> productIds) {
        coupon.getProducts().clear();
        if (CollectionUtils.isEmpty(productIds)) {
            return;
        }
        List<Product> products = productRepository.findAllById(productIds);
        if (products.size() != new HashSet<>(productIds).size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more products were not found");
        }
        coupon.getProducts().addAll(products);
    }

    private void updateCategories(Coupon coupon, List<Long> categoryIds) {
        coupon.getCategories().clear();
        if (CollectionUtils.isEmpty(categoryIds)) {
            return;
        }
        List<Category> categories = categoryRepository.findAllById(categoryIds);
        if (categories.size() != new HashSet<>(categoryIds).size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more categories were not found");
        }
        coupon.getCategories().addAll(categories);
    }

    private void updateUsers(Coupon coupon, List<Long> userIds) {
        coupon.getUsers().clear();
        if (CollectionUtils.isEmpty(userIds)) {
            return;
        }
        List<User> users = userRepository.findAllById(userIds);
        if (users.size() != new HashSet<>(userIds).size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more users were not found");
        }
        coupon.getUsers().addAll(users);
    }

    private void ensureUniqueCode(String code, Long couponId) {
        if (!StringUtils.hasText(code)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon code is required");
        }
        String normalized = code.trim();
        boolean exists = couponId == null
                ? couponRepository.existsByCodeIgnoreCase(normalized)
                : couponRepository.existsByCodeIgnoreCaseAndIdNot(normalized, couponId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon code already exists");
        }
    }

    private Map<String, Object> buildContext(Coupon coupon) {
        Map<String, Object> context = new HashMap<>();
        context.put("couponId", coupon.getId());
        context.put("couponCode", coupon.getCode());
        context.put("couponType", coupon.getType());
        context.put("couponStatus", coupon.getStatus());
        return context;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
