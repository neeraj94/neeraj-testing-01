package com.example.rbac.admin.setup.dto;

import java.util.ArrayList;
import java.util.List;

public class MenuLayoutUpdateRequest {

    private List<MenuNodeConfigDto> layout = new ArrayList<>();

    public List<MenuNodeConfigDto> getLayout() {
        return layout;
    }

    public void setLayout(List<MenuNodeConfigDto> layout) {
        this.layout = layout;
    }
}
