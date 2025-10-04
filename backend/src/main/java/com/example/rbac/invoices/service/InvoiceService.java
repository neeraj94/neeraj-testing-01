package com.example.rbac.invoices.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.customers.model.Customer;
import com.example.rbac.customers.repository.CustomerRepository;
import com.example.rbac.invoices.dto.InvoiceDto;
import com.example.rbac.invoices.dto.InvoiceItemRequest;
import com.example.rbac.invoices.dto.InvoiceRequest;
import com.example.rbac.invoices.mapper.InvoiceMapper;
import com.example.rbac.invoices.model.Invoice;
import com.example.rbac.invoices.model.InvoiceItem;
import com.example.rbac.invoices.repository.InvoiceRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final InvoiceMapper invoiceMapper;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          CustomerRepository customerRepository,
                          InvoiceMapper invoiceMapper) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.invoiceMapper = invoiceMapper;
    }

    @PreAuthorize("hasAuthority('INVOICE_VIEW')")
    @Transactional
    public PageResponse<InvoiceDto> list(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Invoice> invoices = invoiceRepository.findAll(pageable);
        return PageResponse.from(invoices.map(invoiceMapper::toDto));
    }

    @PreAuthorize("hasAuthority('INVOICE_CREATE')")
    @Transactional
    public InvoiceDto create(InvoiceRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Customer not found"));
        Invoice invoice = new Invoice();
        invoice.setCustomer(customer);
        applyInvoiceData(invoice, request);
        invoice = invoiceRepository.save(invoice);
        return invoiceMapper.toDto(invoice);
    }

    @PreAuthorize("hasAuthority('INVOICE_VIEW')")
    @Transactional
    public InvoiceDto get(Long id) {
        Invoice invoice = invoiceRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invoice not found"));
        return invoiceMapper.toDto(invoice);
    }

    @PreAuthorize("hasAuthority('INVOICE_UPDATE')")
    @Transactional
    public InvoiceDto update(Long id, InvoiceRequest request) {
        Invoice invoice = invoiceRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invoice not found"));
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Customer not found"));
        invoice.setCustomer(customer);
        applyInvoiceData(invoice, request);
        invoice = invoiceRepository.save(invoice);
        return invoiceMapper.toDto(invoice);
    }

    @PreAuthorize("hasAuthority('INVOICE_DELETE')")
    public void delete(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Invoice not found");
        }
        invoiceRepository.deleteById(id);
    }

    private void applyInvoiceData(Invoice invoice, InvoiceRequest request) {
        invoice.setNumber(request.getNumber());
        invoice.setIssueDate(request.getIssueDate());
        invoice.setDueDate(request.getDueDate());
        invoice.setStatus(request.getStatus());
        List<InvoiceItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (InvoiceItemRequest itemRequest : request.getItems()) {
            InvoiceItem item = new InvoiceItem();
            item.setInvoice(invoice);
            item.setDescription(itemRequest.getDescription());
            item.setQty(itemRequest.getQty());
            item.setUnitPrice(itemRequest.getUnitPrice());
            BigDecimal lineTotal = itemRequest.getUnitPrice().multiply(BigDecimal.valueOf(itemRequest.getQty()));
            item.setLineTotal(lineTotal.setScale(2, RoundingMode.HALF_UP));
            subtotal = subtotal.add(item.getLineTotal());
            items.add(item);
        }
        BigDecimal tax = BigDecimal.ZERO;
        if (request.getTaxRate() != null) {
            tax = subtotal.multiply(request.getTaxRate()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        BigDecimal total = subtotal.add(tax);
        invoice.getItems().clear();
        invoice.getItems().addAll(items);
        invoice.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        invoice.setTax(tax.setScale(2, RoundingMode.HALF_UP));
        invoice.setTotal(total.setScale(2, RoundingMode.HALF_UP));
    }
}
