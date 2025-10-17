package com.example.rbac.users.service;

import com.example.rbac.products.model.Product;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserRecentView;
import com.example.rbac.users.repository.UserRecentViewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
}
