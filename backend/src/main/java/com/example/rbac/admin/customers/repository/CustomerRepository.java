package com.example.rbac.admin.customers.repository;

import com.example.rbac.admin.customers.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
}
