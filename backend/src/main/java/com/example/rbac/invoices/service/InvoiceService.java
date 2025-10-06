package com.example.rbac.invoices.service;

import com.example.rbac.activity.service.ActivityRecorder;
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

import java.util.HashMap;
import java.util.Map;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final InvoiceMapper invoiceMapper;
    private final ActivityRecorder activityRecorder;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          CustomerRepository customerRepository,
                          InvoiceMapper invoiceMapper,
                          ActivityRecorder activityRecorder) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.invoiceMapper = invoiceMapper;
        this.activityRecorder = activityRecorder;
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
        InvoiceDto dto = invoiceMapper.toDto(invoice);
        activityRecorder.record("Invoices", "CREATE", "Created invoice " + invoice.getNumber(), "SUCCESS", buildContext(invoice));
        return dto;
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
        InvoiceDto dto = invoiceMapper.toDto(invoice);
        activityRecorder.record("Invoices", "UPDATE", "Updated invoice " + invoice.getNumber(), "SUCCESS", buildContext(invoice));
        return dto;
    }

    @PreAuthorize("hasAuthority('INVOICE_DELETE')")
    public void delete(Long id) {
        Invoice invoice = invoiceRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invoice not found"));
        invoiceRepository.delete(invoice);
        activityRecorder.record("Invoices", "DELETE", "Deleted invoice " + invoice.getNumber(), "SUCCESS", buildContext(invoice));
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

    private Map<String, Object> buildContext(Invoice invoice) {
        HashMap<String, Object> context = new HashMap<>();
        if (invoice == null) {
            return context;
        }
        if (invoice.getId() != null) {
            context.put("invoiceId", invoice.getId());
        }
        if (invoice.getNumber() != null) {
            context.put("invoiceNumber", invoice.getNumber());
        }
        if (invoice.getCustomer() != null && invoice.getCustomer().getId() != null) {
            context.put("customerId", invoice.getCustomer().getId());
        }
        if (invoice.getStatus() != null) {
            context.put("status", invoice.getStatus());
        }
        return context;
    }
}
