package com.example.rbac.blog.dto;

public class BlogMediaUploadResponse {

    private String key;
    private String url;

    public BlogMediaUploadResponse() {
    }

    public BlogMediaUploadResponse(String key, String url) {
        this.key = key;
        this.url = url;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
