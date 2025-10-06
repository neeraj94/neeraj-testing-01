package com.example.rbac.invoices.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.invoices.dto.InvoiceDto;
import com.example.rbac.invoices.dto.InvoiceRequest;
import com.example.rbac.invoices.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('INVOICE_VIEW')")
    public PageResponse<InvoiceDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                         @RequestParam(name = "size", defaultValue = "20") int size) {
        return invoiceService.list(page, size);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('INVOICE_CREATE')")
    public InvoiceDto create(@Valid @RequestBody InvoiceRequest request) {
        return invoiceService.create(request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('INVOICE_VIEW')")
    public InvoiceDto get(@PathVariable("id") Long id) {
        return invoiceService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('INVOICE_UPDATE')")
    public InvoiceDto update(@PathVariable("id") Long id, @Valid @RequestBody InvoiceRequest request) {
        return invoiceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('INVOICE_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        invoiceService.delete(id);
    }
}
