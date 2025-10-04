package com.example.rbac.customers.mapper;

import com.example.rbac.customers.dto.CustomerDto;
import com.example.rbac.customers.model.Customer;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CustomerMapper {
    CustomerDto toDto(Customer customer);
}
