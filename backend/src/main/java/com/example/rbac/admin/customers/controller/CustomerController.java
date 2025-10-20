package com.example.rbac.admin.customers.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.customers.dto.CustomerDto;
import com.example.rbac.admin.customers.dto.CustomerRequest;
import com.example.rbac.admin.customers.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL')")
    public PageResponse<CustomerDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                          @RequestParam(name = "size", defaultValue = "20") int size) {
        return customerService.list(page, size);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public CustomerDto create(@Valid @RequestBody CustomerRequest request) {
        return customerService.create(request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL')")
    public CustomerDto get(@PathVariable("id") Long id) {
        return customerService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    public CustomerDto update(@PathVariable("id") Long id, @Valid @RequestBody CustomerRequest request) {
        return customerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        customerService.delete(id);
    }
}
