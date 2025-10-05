package com.example.rbac.customers.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.customers.dto.CustomerDto;
import com.example.rbac.customers.dto.CustomerRequest;
import com.example.rbac.customers.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public PageResponse<CustomerDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                          @RequestParam(name = "size", defaultValue = "20") int size) {
        return customerService.list(page, size);
    }

    @PostMapping
    public CustomerDto create(@Valid @RequestBody CustomerRequest request) {
        return customerService.create(request);
    }

    @GetMapping("/{id}")
    public CustomerDto get(@PathVariable("id") Long id) {
        return customerService.get(id);
    }

    @PutMapping("/{id}")
    public CustomerDto update(@PathVariable("id") Long id, @Valid @RequestBody CustomerRequest request) {
        return customerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id) {
        customerService.delete(id);
    }
}
