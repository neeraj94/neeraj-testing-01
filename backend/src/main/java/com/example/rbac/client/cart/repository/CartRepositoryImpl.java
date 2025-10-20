<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/cart/repository/CartRepositoryImpl.java
package com.example.rbac.client.cart.repository;
========
package com.example.rbac.admin.cart.repository;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/cart/repository/CartRepositoryImpl.java

import com.example.rbac.admin.cart.dto.CartSortOption;
import com.example.rbac.admin.cart.dto.CartSummaryRow;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CartRepositoryImpl implements CartRepositoryCustom {

    private final EntityManager entityManager;

    public CartRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public Page<CartSummaryRow> searchActiveCartSummaries(String searchPattern, CartSortOption sortOption, Pageable pageable) {
        StringBuilder selectBuilder = new StringBuilder();
        selectBuilder.append("select new com.example.rbac.admin.cart.dto.CartSummaryRow(")
                .append("c.id, u.id, u.fullName, u.email, c.updatedAt, ")
                .append("SUM(i.unitPrice * i.quantity), SUM(i.quantity)) ")
                .append("from Cart c ")
                .append("join c.user u ")
                .append("left join c.items i ")
                .append("left join i.product p ")
                .append("where 1 = 1 ");

        if (searchPattern != null) {
            selectBuilder.append("and (lower(u.fullName) like :pattern ")
                    .append("or lower(u.email) like :pattern ")
                    .append("or lower(p.name) like :pattern) ");
        }

        selectBuilder.append("group by c.id, u.id, u.fullName, u.email, c.updatedAt ");
        selectBuilder.append(resolveOrderClause(sortOption));

        TypedQuery<CartSummaryRow> query = entityManager.createQuery(selectBuilder.toString(), CartSummaryRow.class);
        if (searchPattern != null) {
            query.setParameter("pattern", searchPattern);
        }
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());
        List<CartSummaryRow> content = query.getResultList();

        StringBuilder countBuilder = new StringBuilder();
        countBuilder.append("select count(distinct c.id) ")
                .append("from Cart c ")
                .append("join c.user u ")
                .append("left join c.items i ")
                .append("left join i.product p ")
                .append("where 1 = 1 ");

        if (searchPattern != null) {
            countBuilder.append("and (lower(u.fullName) like :pattern ")
                    .append("or lower(u.email) like :pattern ")
                    .append("or lower(p.name) like :pattern) ");
        }

        TypedQuery<Long> countQuery = entityManager.createQuery(countBuilder.toString(), Long.class);
        if (searchPattern != null) {
            countQuery.setParameter("pattern", searchPattern);
        }
        long total = countQuery.getSingleResult();

        return new PageImpl<>(content, pageable, total);
    }

    private String resolveOrderClause(CartSortOption sortOption) {
        return switch (sortOption) {
            case OLDEST -> "order by c.updatedAt asc, c.id asc";
            case HIGHEST_AMOUNT -> "order by SUM(i.unitPrice * i.quantity) desc, c.updatedAt desc";
            case LOWEST_AMOUNT -> "order by SUM(i.unitPrice * i.quantity) asc, c.updatedAt desc";
            case NEWEST -> "order by c.updatedAt desc, c.id desc";
        };
    }
}
