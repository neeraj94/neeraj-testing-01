<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/checkout/service/PaymentMethodService.java
package com.example.rbac.client.checkout.service;

import com.example.rbac.client.checkout.dto.PaymentMethodDto;
import com.example.rbac.client.checkout.dto.PaymentMethodSettingsRequest;
========
package com.example.rbac.admin.checkout.service;

import com.example.rbac.admin.checkout.dto.PaymentMethodDto;
import com.example.rbac.admin.checkout.dto.PaymentMethodSettingsRequest;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/checkout/service/PaymentMethodService.java
import com.example.rbac.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PaymentMethodService {

    private final Map<String, PaymentMethodRecord> methods = new ConcurrentHashMap<>();

    public PaymentMethodService() {
        PaymentMethodRecord cod = new PaymentMethodRecord();
        cod.key = "COD";
        cod.displayName = "Cash on Delivery";
        cod.enabled = true;
        cod.notes = "Collect payment in cash when the order is delivered.";
        methods.put(cod.key, cod);
    }

    public List<PaymentMethodDto> listForAdmin() {
        return toDtoList(methods.values());
    }

    public List<PaymentMethodDto> listForCustomer() {
        return toDtoList(methods.values().stream()
                .filter(PaymentMethodRecord::isEnabled)
                .collect(java.util.stream.Collectors.toList()));
    }

    public PaymentMethodDto updateSettings(String key, PaymentMethodSettingsRequest request) {
        if (!StringUtils.hasText(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment method key is required");
        }
        PaymentMethodRecord record = methods.get(key.toUpperCase());
        if (record == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment method not found");
        }
        if (request != null) {
            if (request.getEnabled() != null) {
                record.enabled = request.getEnabled();
            }
            if (request.getNotes() != null) {
                record.notes = request.getNotes().trim();
            }
        }
        return toDto(record);
    }

    public PaymentMethodDto getMethodOrThrow(String key) {
        if (!StringUtils.hasText(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment method is required");
        }
        PaymentMethodRecord record = methods.get(key.toUpperCase());
        if (record == null || !record.enabled) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected payment method is not available");
        }
        return toDto(record);
    }

    private List<PaymentMethodDto> toDtoList(Iterable<PaymentMethodRecord> records) {
        List<PaymentMethodDto> dtos = new ArrayList<>();
        for (PaymentMethodRecord record : records) {
            dtos.add(toDto(record));
        }
        return dtos;
    }

    private PaymentMethodDto toDto(PaymentMethodRecord record) {
        PaymentMethodDto dto = new PaymentMethodDto();
        dto.setKey(record.key);
        dto.setDisplayName(record.displayName);
        dto.setEnabled(record.enabled);
        dto.setNotes(record.notes);
        return dto;
    }

    private static final class PaymentMethodRecord {
        private String key;
        private String displayName;
        private boolean enabled;
        private String notes;

        private boolean isEnabled() {
            return enabled;
        }
    }
}
