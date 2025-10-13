package com.example.rbac.invoices.mapper;

import com.example.rbac.invoices.dto.InvoiceDto;
import com.example.rbac.invoices.dto.InvoiceItemDto;
import com.example.rbac.invoices.model.Invoice;
import com.example.rbac.invoices.model.InvoiceItem;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class InvoiceMapper {

    public InvoiceDto toDto(Invoice invoice) {
        if (invoice == null) {
            return null;
        }
        InvoiceDto dto = new InvoiceDto();
        dto.setId(invoice.getId());
        if (invoice.getCustomer() != null) {
            dto.setCustomerId(invoice.getCustomer().getId());
            dto.setCustomerName(invoice.getCustomer().getName());
        }
        dto.setNumber(invoice.getNumber());
        dto.setIssueDate(invoice.getIssueDate());
        dto.setDueDate(invoice.getDueDate());
        dto.setStatus(invoice.getStatus());
        dto.setSubtotal(invoice.getSubtotal());
        dto.setTax(invoice.getTax());
        dto.setTotal(invoice.getTotal());
        dto.setItems(toItemDtos(invoice.getItems()));
        dto.setCreatedAt(invoice.getCreatedAt());
        dto.setUpdatedAt(invoice.getUpdatedAt());
        return dto;
    }

    public List<InvoiceItemDto> toItemDtos(List<InvoiceItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        return items.stream().map(this::toItemDto).collect(Collectors.toList());
    }

    private InvoiceItemDto toItemDto(InvoiceItem item) {
        if (item == null) {
            return null;
        }
        InvoiceItemDto dto = new InvoiceItemDto();
        dto.setId(item.getId());
        dto.setDescription(item.getDescription());
        dto.setQty(item.getQty());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setLineTotal(item.getLineTotal());
        return dto;
    }
}
