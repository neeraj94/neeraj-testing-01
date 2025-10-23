package com.example.rbac.admin.users.service;

import com.example.rbac.admin.products.model.DiscountType;
import com.example.rbac.admin.products.model.Product;
import com.example.rbac.admin.products.repository.ProductRepository;
import com.example.rbac.admin.users.dto.UserRecentViewDto;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.model.UserRecentView;
import com.example.rbac.admin.users.repository.projection.UserRecentViewSummary;
import com.example.rbac.admin.users.repository.UserRecentViewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserRecentViewServiceTest {

    @Mock
    private UserRecentViewRepository recentViewRepository;

    @Mock
    private ProductRepository productRepository;

    private UserRecentViewService service;

    @BeforeEach
    void setUp() {
        service = new UserRecentViewService(recentViewRepository, productRepository);
    }

    @Test
    void getRecentViewsForUserReturnsOrderedDtos() {
        UserRecentViewSummary firstSummary = summary(101L, 10L, Instant.parse("2024-01-02T10:15:30Z"));
        UserRecentViewSummary secondSummary = summary(102L, 20L, Instant.parse("2024-01-01T08:00:00Z"));

        when(recentViewRepository.findRecentSummariesByUserId(1L))
                .thenReturn(List.of(firstSummary, secondSummary));

        Product firstProduct = new Product();
        firstProduct.setId(10L);
        firstProduct.setName("Sunrise Lamp");
        firstProduct.setSlug("sunrise-lamp");
        firstProduct.setSku("SUN-LAMP");
        firstProduct.setUnitPrice(new BigDecimal("49.99"));

        Product secondProduct = new Product();
        secondProduct.setId(20L);
        secondProduct.setName("Aurora Blanket");
        secondProduct.setSlug("aurora-blanket");
        secondProduct.setSku("AUR-BLANKET");
        secondProduct.setUnitPrice(new BigDecimal("89.50"));
        secondProduct.setDiscountType(DiscountType.PERCENTAGE);
        secondProduct.setDiscountValue(new BigDecimal("10"));

        when(productRepository.findByIdIn(List.of(10L, 20L)))
                .thenReturn(List.of(firstProduct, secondProduct));

        List<UserRecentViewDto> recentViews = service.getRecentViewsForUser(1L);

        assertEquals(2, recentViews.size());
        assertEquals(10L, recentViews.get(0).getProductId());
        assertEquals("Sunrise Lamp", recentViews.get(0).getProductName());
        assertEquals("sunrise-lamp", recentViews.get(0).getProductSlug());
        assertEquals("SUN-LAMP", recentViews.get(0).getSku());
        assertEquals(new BigDecimal("49.99"), recentViews.get(0).getUnitPrice());

        assertEquals(20L, recentViews.get(1).getProductId());
        assertEquals("Aurora Blanket", recentViews.get(1).getProductName());
        assertEquals(new BigDecimal("89.50"), recentViews.get(1).getUnitPrice());
        assertEquals(new BigDecimal("80.55"), recentViews.get(1).getFinalPrice());
        assertTrue(recentViews.get(0).getLastViewedAt().isAfter(recentViews.get(1).getLastViewedAt()));
    }

    @Test
    void synchronizeGuestRecentViewsMergesGuestHistory() {
        User user = new User();
        user.setId(1L);

        Product productFive = new Product();
        productFive.setId(5L);
        Product productFifteen = new Product();
        productFifteen.setId(15L);
        Product productTwenty = new Product();
        productTwenty.setId(20L);

        UserRecentView existingForFifteen = new UserRecentView();
        existingForFifteen.setProduct(productFifteen);

        when(recentViewRepository.findByUserIdAndProductIdIn(eq(1L), anyCollection()))
                .thenReturn(List.of(existingForFifteen));
        when(productRepository.findByIdIn(anyList()))
                .thenReturn(List.of(productFive, productFifteen, productTwenty));
        when(recentViewRepository.findByUserIdOrderByViewedAtDesc(1L))
                .thenReturn(List.of());

        service.synchronizeGuestRecentViews(user, List.of(5L, 10L, 5L, null, -15L, 20L), 10L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<Long>> idsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(recentViewRepository).findByUserIdAndProductIdIn(eq(1L), idsCaptor.capture());
        assertEquals(List.of(5L, 15L, 20L), new ArrayList<>(idsCaptor.getValue()));

        ArgumentCaptor<UserRecentView> viewCaptor = ArgumentCaptor.forClass(UserRecentView.class);
        verify(recentViewRepository, times(3)).save(viewCaptor.capture());
        List<UserRecentView> savedViews = viewCaptor.getAllValues();
        assertEquals(List.of(5L, 15L, 20L), savedViews.stream()
                .map(view -> view.getProduct().getId())
                .collect(Collectors.toList()));

        Instant firstTimestamp = savedViews.get(0).getViewedAt();
        Instant secondTimestamp = savedViews.get(1).getViewedAt();
        Instant thirdTimestamp = savedViews.get(2).getViewedAt();
        assertNotNull(firstTimestamp);
        assertNotNull(secondTimestamp);
        assertNotNull(thirdTimestamp);
        assertTrue(firstTimestamp.isAfter(secondTimestamp));
        assertTrue(secondTimestamp.isAfter(thirdTimestamp));
    }

    private static UserRecentViewSummary summary(Long id, Long productId, Instant viewedAt) {
        return new TestUserRecentViewSummary(id, productId, viewedAt);
    }

    private static final class TestUserRecentViewSummary implements UserRecentViewSummary {

        private final Long id;
        private final Long productId;
        private final Instant viewedAt;

        private TestUserRecentViewSummary(Long id, Long productId, Instant viewedAt) {
            this.id = id;
            this.productId = productId;
            this.viewedAt = viewedAt;
        }

        @Override
        public Long getId() {
            return id;
        }

        @Override
        public Long getProductId() {
            return productId;
        }

        @Override
        public Instant getViewedAt() {
            return viewedAt;
        }
    }
}
