package com.example.rbac.admin.uploadedfile.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.uploadedfile.dto.UploadedFileDeleteRequest;
import com.example.rbac.admin.uploadedfile.dto.UploadedFileDto;
import com.example.rbac.admin.uploadedfile.dto.UploadedFileModuleDto;
import com.example.rbac.admin.uploadedfile.dto.UploadedFileUploaderDto;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.admin.uploadedfile.dto.UploadedFileUploadResponse;
import com.example.rbac.admin.uploadedfile.model.UploadedFileModule;
import com.example.rbac.admin.uploadedfile.service.UploadedFileService;
import com.example.rbac.admin.uploadedfile.service.UploadedFileStorageService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/uploaded-files")
public class UploadedFileController {

    private final UploadedFileService uploadedFileService;
    private final UploadedFileStorageService storageService;

    public UploadedFileController(UploadedFileService uploadedFileService,
                                  UploadedFileStorageService storageService) {
        this.uploadedFileService = uploadedFileService;
        this.storageService = storageService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE','PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_UPDATE','BRAND_VIEW','BRAND_CREATE','BRAND_UPDATE','CATEGORY_VIEW','CATEGORY_CREATE','CATEGORY_UPDATE','BADGE_VIEW','BADGE_CREATE','BADGE_UPDATE','BADGE_CATEGORY_VIEW','BADGE_CATEGORY_CREATE','BADGE_CATEGORY_UPDATE','BLOG_POST_VIEW','BLOG_POST_CREATE','BLOG_POST_UPDATE','WEDGE_VIEW','WEDGE_CREATE','WEDGE_UPDATE')")
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
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE','PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_UPDATE','BRAND_VIEW','BRAND_CREATE','BRAND_UPDATE','CATEGORY_VIEW','CATEGORY_CREATE','CATEGORY_UPDATE','BADGE_VIEW','BADGE_CREATE','BADGE_UPDATE','BADGE_CATEGORY_VIEW','BADGE_CATEGORY_CREATE','BADGE_CATEGORY_UPDATE','BLOG_POST_VIEW','BLOG_POST_CREATE','BLOG_POST_UPDATE','WEDGE_VIEW','WEDGE_CREATE','WEDGE_UPDATE')")
    public UploadedFileDto get(@PathVariable("id") Long id) {
        return uploadedFileService.get(id);
    }

    @GetMapping("/modules")
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE','PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_UPDATE','BRAND_VIEW','BRAND_CREATE','BRAND_UPDATE','CATEGORY_VIEW','CATEGORY_CREATE','CATEGORY_UPDATE','BADGE_VIEW','BADGE_CREATE','BADGE_UPDATE','BADGE_CATEGORY_VIEW','BADGE_CATEGORY_CREATE','BADGE_CATEGORY_UPDATE','BLOG_POST_VIEW','BLOG_POST_CREATE','BLOG_POST_UPDATE','WEDGE_VIEW','WEDGE_CREATE','WEDGE_UPDATE')")
    public List<UploadedFileModuleDto> modules() {
        return uploadedFileService.listModules();
    }

    @GetMapping("/uploaders")
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_VIEW','UPLOADED_FILE_MANAGE','PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_UPDATE','BRAND_VIEW','BRAND_CREATE','BRAND_UPDATE','CATEGORY_VIEW','CATEGORY_CREATE','CATEGORY_UPDATE','BADGE_VIEW','BADGE_CREATE','BADGE_UPDATE','BADGE_CATEGORY_VIEW','BADGE_CATEGORY_CREATE','BADGE_CATEGORY_UPDATE','BLOG_POST_VIEW','BLOG_POST_CREATE','BLOG_POST_UPDATE','WEDGE_VIEW','WEDGE_CREATE','WEDGE_UPDATE')")
    public List<UploadedFileUploaderDto> uploaders() {
        return uploadedFileService.listUploaders();
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyAuthority('UPLOADED_FILE_MANAGE','PRODUCT_CREATE','PRODUCT_UPDATE','BRAND_CREATE','BRAND_UPDATE','CATEGORY_CREATE','CATEGORY_UPDATE','BADGE_CREATE','BADGE_UPDATE','BADGE_CATEGORY_CREATE','BADGE_CATEGORY_UPDATE','BLOG_POST_CREATE','BLOG_POST_UPDATE','WEDGE_CREATE','WEDGE_UPDATE')")
    public List<UploadedFileUploadResponse> upload(@RequestParam("files") List<MultipartFile> files,
                                                   @RequestParam(name = "module", required = false) String moduleKey) {
        if (files == null || files.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one file to upload");
        }
        List<MultipartFile> sanitized = files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .collect(Collectors.toList());
        if (sanitized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one file to upload");
        }
        UploadedFileModule module = UploadedFileModule.fromValue(moduleKey)
                .orElse(UploadedFileModule.PRODUCT_MEDIA);
        return sanitized.stream()
                .map(file -> {
                    UploadedFileStorageService.StoredFile stored = storageService.store(file);
                    String publicUrl = storageService.publicUrlForKey(stored.key());
                    uploadedFileService.recordUpload(module,
                            stored.key(),
                            publicUrl,
                            stored.originalFilename(),
                            stored.mimeType(),
                            stored.sizeBytes());
                    return new UploadedFileUploadResponse(
                            publicUrl,
                            stored.key(),
                            stored.originalFilename(),
                            stored.mimeType(),
                            stored.sizeBytes()
                    );
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/assets/{key:.+}")
    public ResponseEntity<Resource> serve(@PathVariable("key") String key) {
        Resource resource = storageService.loadAsResource(key);
        String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        try {
            contentType = Files.probeContentType(resource.getFile().toPath());
        } catch (IOException ignored) {
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType != null ? contentType : MediaType.APPLICATION_OCTET_STREAM_VALUE)
                .body(resource);
    }

    @PostMapping("/delete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('UPLOADED_FILE_MANAGE')")
    public void delete(@RequestBody @Valid UploadedFileDeleteRequest request) {
        uploadedFileService.delete(request.getIds());
    }
}
