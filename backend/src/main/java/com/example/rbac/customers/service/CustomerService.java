package com.example.rbac.customers.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.customers.dto.CustomerDto;
import com.example.rbac.customers.dto.CustomerRequest;
import com.example.rbac.customers.mapper.CustomerMapper;
import com.example.rbac.customers.model.Customer;
import com.example.rbac.customers.repository.CustomerRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;

    public CustomerService(CustomerRepository customerRepository,
                           CustomerMapper customerMapper) {
        this.customerRepository = customerRepository;
        this.customerMapper = customerMapper;
    }

    @PreAuthorize("hasAuthority('CUSTOMER_VIEW')")
    public PageResponse<CustomerDto> list(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CustomerDto> result = customerRepository.findAll(pageable).map(customerMapper::toDto);
        return PageResponse.from(result);
    }

    @PreAuthorize("hasAuthority('CUSTOMER_CREATE')")
    @Transactional
    public CustomerDto create(CustomerRequest request) {
        Customer customer = new Customer();
        customer.setName(request.getName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer = customerRepository.save(customer);
        return customerMapper.toDto(customer);
    }

    @PreAuthorize("hasAuthority('CUSTOMER_VIEW')")
    public CustomerDto get(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        return customerMapper.toDto(customer);
    }

    @PreAuthorize("hasAuthority('CUSTOMER_UPDATE')")
    @Transactional
    public CustomerDto update(Long id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        customer.setName(request.getName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer = customerRepository.save(customer);
        return customerMapper.toDto(customer);
    }

    @PreAuthorize("hasAuthority('CUSTOMER_DELETE')")
    public void delete(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Customer not found");
        }
        customerRepository.deleteById(id);
    }
}
