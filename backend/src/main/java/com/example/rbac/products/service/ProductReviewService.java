package com.example.rbac.products.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.customers.model.Customer;
import com.example.rbac.customers.repository.CustomerRepository;
import com.example.rbac.products.dto.MediaSelectionRequest;
import com.example.rbac.products.dto.ProductReviewDto;
import com.example.rbac.products.dto.ProductReviewRequest;
import com.example.rbac.products.mapper.ProductReviewMapper;
import com.example.rbac.products.model.MediaAsset;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductReview;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.products.repository.ProductReviewRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class ProductReviewService {

    private final ProductReviewRepository productReviewRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final ProductReviewMapper productReviewMapper;

    public ProductReviewService(ProductReviewRepository productReviewRepository,
                                ProductRepository productRepository,
                                CustomerRepository customerRepository,
                                ProductReviewMapper productReviewMapper) {
        this.productReviewRepository = productReviewRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.productReviewMapper = productReviewMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductReviewDto> list(Integer page,
                                               Integer size,
                                               Long productId,
                                               Long categoryId,
                                               Long customerId,
                                               Integer ratingMin,
                                               Integer ratingMax) {
        Pageable pageable = PageRequest.of(Math.max(page != null ? page : 0, 0),
                Math.max(size != null ? size : 20, 1),
                Sort.by(Sort.Direction.DESC, "reviewedAt", "id"));
        Specification<ProductReview> specification = buildSpecification(productId, categoryId, customerId, ratingMin, ratingMax);
        Page<ProductReview> result = productReviewRepository.findAll(specification, pageable);
        initializeAssociations(result.getContent());
        return PageResponse.from(result.map(productReviewMapper::toDto));
    }

    @Transactional(readOnly = true)
    public ProductReviewDto get(Long id) {
        ProductReview review = productReviewRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        initializeAssociations(List.of(review));
        return productReviewMapper.toDto(review);
    }

    @Transactional(readOnly = true)
    public List<ProductReview> listForProduct(Long productId) {
        List<ProductReview> reviews = productReviewRepository.findByProductIdOrderByReviewedAtDesc(productId);
        initializeAssociations(reviews);
        return reviews;
    }

    @Transactional
    public ProductReviewDto create(ProductReviewRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Product not found"));
        ProductReview review = new ProductReview();
        review.setProduct(product);
        applyRequest(review, request);
        ProductReview saved = productReviewRepository.save(review);
        initializeAssociations(List.of(saved));
        return productReviewMapper.toDto(saved);
    }

    @Transactional
    public ProductReviewDto update(Long id, ProductReviewRequest request) {
        ProductReview review = productReviewRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        if (!Objects.equals(review.getProduct().getId(), request.getProductId())) {
            Product product = productRepository.findById(request.getProductId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Product not found"));
            review.setProduct(product);
        }
        applyRequest(review, request);
        ProductReview saved = productReviewRepository.save(review);
        initializeAssociations(List.of(saved));
        return productReviewMapper.toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        ProductReview review = productReviewRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        productReviewRepository.delete(review);
    }

    private void applyRequest(ProductReview review, ProductReviewRequest request) {
        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Customer not found"));
        }
        review.setCustomer(customer);
        String reviewerName = trimToNull(request.getReviewerName());
        if (customer != null && !StringUtils.hasText(reviewerName)) {
            reviewerName = customer.getName();
        }
        review.setReviewerName(reviewerName);
        MediaAsset reviewerAvatar = toMediaAsset(request.getReviewerAvatar());
        if (customer != null && (reviewerAvatar == null || !StringUtils.hasText(reviewerAvatar.getUrl()))) {
            MediaAsset customerAvatar = fromProfileImage(customer.getProfileImageUrl());
            if (customerAvatar != null) {
                reviewerAvatar = customerAvatar;
            }
        }
        review.setReviewerAvatar(reviewerAvatar);
        review.setRating(request.getRating());
        review.setComment(trimToNull(request.getComment()));
        review.setReviewedAt(request.getReviewedAt() != null ? request.getReviewedAt() : Instant.now());

        List<MediaAsset> mediaAssets = new ArrayList<>();
        if (!CollectionUtils.isEmpty(request.getMedia())) {
            for (MediaSelectionRequest item : request.getMedia()) {
                MediaAsset asset = toMediaAsset(item);
                if (asset == null) {
                    continue;
                }
                mediaAssets.add(asset);
            }
        }
        review.getMedia().clear();
        review.getMedia().addAll(mediaAssets);
    }

    private Specification<ProductReview> buildSpecification(Long productId,
                                                             Long categoryId,
                                                             Long customerId,
                                                             Integer ratingMin,
                                                             Integer ratingMax) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (productId != null) {
                predicates.add(builder.equal(root.get("product").get("id"), productId));
            }
            if (customerId != null) {
                predicates.add(builder.equal(root.get("customer").get("id"), customerId));
            }
            if (categoryId != null) {
                Join<ProductReview, Product> productJoin = root.join("product", JoinType.INNER);
                Join<Product, ?> categoryJoin = productJoin.join("categories", JoinType.INNER);
                predicates.add(builder.equal(categoryJoin.get("id"), categoryId));
            }
            if (ratingMin != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("rating"), ratingMin));
            }
            if (ratingMax != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("rating"), ratingMax));
            }
            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void initializeAssociations(List<ProductReview> reviews) {
        for (ProductReview review : reviews) {
            if (review.getProduct() != null) {
                review.getProduct().getName();
                review.getProduct().getCategories().size();
            }
            if (review.getCustomer() != null) {
                review.getCustomer().getName();
                review.getCustomer().getProfileImageUrl();
            }
            review.getMedia().size();
        }
    }

    private MediaAsset toMediaAsset(MediaSelectionRequest request) {
        if (request == null || !StringUtils.hasText(request.getUrl())) {
            return null;
        }
        MediaAsset asset = new MediaAsset();
        asset.setUrl(request.getUrl().trim());
        asset.setStorageKey(trimToNull(request.getStorageKey()));
        asset.setOriginalFilename(trimToNull(request.getOriginalFilename()));
        asset.setMimeType(trimToNull(request.getMimeType()));
        asset.setSizeBytes(request.getSizeBytes());
        return asset;
    }

    private MediaAsset fromProfileImage(String url) {
        if (!StringUtils.hasText(url)) {
            return null;
        }
        MediaAsset asset = new MediaAsset();
        asset.setUrl(url.trim());
        return asset;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
