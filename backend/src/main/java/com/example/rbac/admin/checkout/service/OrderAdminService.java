package com.example.rbac.admin.checkout.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.client.checkout.model.CheckoutOrder;
import com.example.rbac.client.checkout.repository.CheckoutOrderRepository;
import com.example.rbac.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class OrderAdminService {

    private final CheckoutOrderRepository orderRepository;
    private final ActivityRecorder activityRecorder;

    public OrderAdminService(CheckoutOrderRepository orderRepository,
                             ActivityRecorder activityRecorder) {
        this.orderRepository = orderRepository;
        this.activityRecorder = activityRecorder;
    }

    @Transactional
    public void deleteOrder(Long orderId) {
        CheckoutOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String orderNumber = resolveOrderReference(order);
        Long customerId = order.getUserId();

        orderRepository.delete(order);

        Map<String, Object> context = new HashMap<>();
        context.put("orderId", order.getId());
        context.put("orderNumber", orderNumber);
        if (customerId != null) {
            context.put("customerId", customerId);
        }
        context.put("deletedAt", Instant.now().toString());

        activityRecorder.record("Orders", "DELETE", "Deleted order " + orderNumber, "SUCCESS", context);
    }

    private String resolveOrderReference(CheckoutOrder order) {
        if (order == null) {
            return "#UNKNOWN";
        }
        String orderNumber = order.getOrderNumber();
        if (orderNumber != null && !orderNumber.isBlank()) {
            return orderNumber;
        }
        Long id = order.getId();
        if (id != null) {
            return "#" + id;
        }
        return "#UNKNOWN";
    }
}
