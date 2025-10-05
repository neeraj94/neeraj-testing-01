package com.example.rbac.invoices.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.invoices.dto.InvoiceDto;
import com.example.rbac.invoices.dto.InvoiceRequest;
import com.example.rbac.invoices.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    public PageResponse<InvoiceDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                         @RequestParam(name = "size", defaultValue = "20") int size) {
        return invoiceService.list(page, size);
    }

    @PostMapping
    public InvoiceDto create(@Valid @RequestBody InvoiceRequest request) {
        return invoiceService.create(request);
    }

    @GetMapping("/{id}")
    public InvoiceDto get(@PathVariable("id") Long id) {
        return invoiceService.get(id);
    }

    @PutMapping("/{id}")
    public InvoiceDto update(@PathVariable("id") Long id, @Valid @RequestBody InvoiceRequest request) {
        return invoiceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id) {
        invoiceService.delete(id);
    }
}
