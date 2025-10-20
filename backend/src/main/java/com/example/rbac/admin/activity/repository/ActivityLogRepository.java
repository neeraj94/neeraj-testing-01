package com.example.rbac.admin.activity.repository;

import com.example.rbac.admin.activity.model.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long>, JpaSpecificationExecutor<ActivityLog> {

    @Query("select distinct a.activityType from ActivityLog a where a.activityType is not null order by lower(a.activityType)")
    List<String> findDistinctActivityTypes();

    @Query("select distinct a.moduleName from ActivityLog a where a.moduleName is not null order by lower(a.moduleName)")
    List<String> findDistinctModules();

    @Query("select distinct a.status from ActivityLog a where a.status is not null order by lower(a.status)")
    List<String> findDistinctStatuses();

    @Query("select distinct a.userRole from ActivityLog a where a.userRole is not null order by lower(a.userRole)")
    List<String> findDistinctRoles();

    @Query("select distinct a.department from ActivityLog a where a.department is not null order by lower(a.department)")
    List<String> findDistinctDepartments();

    @Query("select distinct a.ipAddress from ActivityLog a where a.ipAddress is not null order by a.ipAddress")
    List<String> findDistinctIpAddresses();

    @Query("select distinct a.device from ActivityLog a where a.device is not null order by lower(a.device)")
    List<String> findDistinctDevices();
}
