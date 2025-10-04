package com.example.rbac.invoices.mapper;

import com.example.rbac.invoices.dto.InvoiceDto;
import com.example.rbac.invoices.dto.InvoiceItemDto;
import com.example.rbac.invoices.model.Invoice;
import com.example.rbac.invoices.model.InvoiceItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface InvoiceMapper {

    @Mapping(target = "customerId", expression = "java(invoice.getCustomer().getId())")
    @Mapping(target = "customerName", expression = "java(invoice.getCustomer().getName())")
    @Mapping(target = "items", expression = "java(toItemDtos(invoice.getItems()))")
    InvoiceDto toDto(Invoice invoice);

    default List<InvoiceItemDto> toItemDtos(List<InvoiceItem> items) {
        return items.stream().map(this::toItemDto).collect(Collectors.toList());
    }

    default InvoiceItemDto toItemDto(InvoiceItem item) {
        InvoiceItemDto dto = new InvoiceItemDto();
        dto.setId(item.getId());
        dto.setDescription(item.getDescription());
        dto.setQty(item.getQty());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setLineTotal(item.getLineTotal());
        return dto;
    }
}
