package com.example.rbac.uploadedfile.repository;

import com.example.rbac.uploadedfile.dto.UploadedFileUploaderDto;
import com.example.rbac.uploadedfile.model.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long>, JpaSpecificationExecutor<UploadedFile> {

    @Query("select distinct new com.example.rbac.uploadedfile.dto.UploadedFileUploaderDto(f.uploadedById, f.uploadedByName) " +
            "from UploadedFile f where f.uploadedById is not null order by f.uploadedByName asc")
    List<UploadedFileUploaderDto> findDistinctUploaders();
}
