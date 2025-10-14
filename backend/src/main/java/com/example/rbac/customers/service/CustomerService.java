package com.example.rbac.customers.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.customers.dto.CustomerDto;
import com.example.rbac.customers.dto.CustomerRequest;
import com.example.rbac.customers.mapper.CustomerMapper;
import com.example.rbac.customers.model.Customer;
import com.example.rbac.customers.repository.CustomerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;
    private final ActivityRecorder activityRecorder;

    public CustomerService(CustomerRepository customerRepository,
                           CustomerMapper customerMapper,
                           ActivityRecorder activityRecorder) {
        this.customerRepository = customerRepository;
        this.customerMapper = customerMapper;
        this.activityRecorder = activityRecorder;
    }

    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN')")
    public PageResponse<CustomerDto> list(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CustomerDto> result = customerRepository.findAll(pageable).map(customerMapper::toDto);
        return PageResponse.from(result);
    }

    @PreAuthorize("hasAuthority('USER_CREATE')")
    @Transactional
    public CustomerDto create(CustomerRequest request) {
        Customer customer = new Customer();
        customer.setName(request.getName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setProfileImageUrl(trimToNull(request.getProfileImageUrl()));
        customer = customerRepository.save(customer);
        CustomerDto dto = customerMapper.toDto(customer);
        activityRecorder.record("Customers", "CREATE", "Created customer " + customer.getName(), "SUCCESS", buildContext(customer));
        return dto;
    }

    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN')")
    public CustomerDto get(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        return customerMapper.toDto(customer);
    }

    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Transactional
    public CustomerDto update(Long id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        customer.setName(request.getName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setProfileImageUrl(trimToNull(request.getProfileImageUrl()));
        customer = customerRepository.save(customer);
        CustomerDto dto = customerMapper.toDto(customer);
        activityRecorder.record("Customers", "UPDATE", "Updated customer " + customer.getName(), "SUCCESS", buildContext(customer));
        return dto;
    }

    @PreAuthorize("hasAuthority('USER_DELETE')")
    public void delete(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found"));
        customerRepository.delete(customer);
        activityRecorder.record("Customers", "DELETE", "Deleted customer " + customer.getName(), "SUCCESS", buildContext(customer));
    }

    private Map<String, Object> buildContext(Customer customer) {
        HashMap<String, Object> context = new HashMap<>();
        if (customer == null) {
            return context;
        }
        if (customer.getId() != null) {
            context.put("customerId", customer.getId());
        }
        if (customer.getName() != null) {
            context.put("name", customer.getName());
        }
        if (customer.getEmail() != null) {
            context.put("email", customer.getEmail());
        }
        return context;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
