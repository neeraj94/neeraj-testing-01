package com.example.rbac.uploadedfile.dto;

public class UploadedFileModuleDto {

    private String module;
    private String featureName;
    private String contextLabel;

    public UploadedFileModuleDto() {
    }

    public UploadedFileModuleDto(String module, String featureName, String contextLabel) {
        this.module = module;
        this.featureName = featureName;
        this.contextLabel = contextLabel;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getFeatureName() {
        return featureName;
    }

    public void setFeatureName(String featureName) {
        this.featureName = featureName;
    }

    public String getContextLabel() {
        return contextLabel;
    }

    public void setContextLabel(String contextLabel) {
        this.contextLabel = contextLabel;
    }
}
