package com.example.rbac.products.repository;

import com.example.rbac.products.model.ProductReview;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long>, JpaSpecificationExecutor<ProductReview> {

    @EntityGraph(attributePaths = {"product", "product.categories", "customer"})
    List<ProductReview> findByProductIdOrderByReviewedAtDesc(Long productId);

    @EntityGraph(attributePaths = {"product", "customer"})
    List<ProductReview> findByProductIdAndPublishedTrueOrderByReviewedAtDesc(Long productId);
}
