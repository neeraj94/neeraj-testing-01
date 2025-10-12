package com.example.rbac.uploadedfile.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.uploadedfile.dto.UploadedFileDto;
import com.example.rbac.uploadedfile.dto.UploadedFileModuleDto;
import com.example.rbac.uploadedfile.dto.UploadedFileUploaderDto;
import com.example.rbac.uploadedfile.service.UploadedFileService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/uploaded-files")
public class UploadedFileController {

    private final UploadedFileService uploadedFileService;

    public UploadedFileController(UploadedFileService uploadedFileService) {
        this.uploadedFileService = uploadedFileService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE')")
    public PageResponse<UploadedFileDto> list(@RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
                                              @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
                                              @RequestParam(name = "module", required = false) List<String> modules,
                                              @RequestParam(name = "feature", required = false) String feature,
                                              @RequestParam(name = "fileType", required = false) String fileType,
                                              @RequestParam(name = "uploadedBy", required = false) Long uploadedBy,
                                              @RequestParam(name = "from", required = false)
                                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                              @RequestParam(name = "to", required = false)
                                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                              @RequestParam(name = "search", required = false) String search) {
        return uploadedFileService.list(page, size, modules, feature, fileType, uploadedBy, from, to, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE')")
    public UploadedFileDto get(@PathVariable("id") Long id) {
        return uploadedFileService.get(id);
    }

    @GetMapping("/modules")
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE')")
    public List<UploadedFileModuleDto> modules() {
        return uploadedFileService.listModules();
    }

    @GetMapping("/uploaders")
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE')")
    public List<UploadedFileUploaderDto> uploaders() {
        return uploadedFileService.listUploaders();
    }
}
