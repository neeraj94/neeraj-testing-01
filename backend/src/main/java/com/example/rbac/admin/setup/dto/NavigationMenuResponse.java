package com.example.rbac.admin.setup.dto;

import java.util.ArrayList;
import java.util.List;

public class NavigationMenuResponse {

    private List<MenuNodeDto> menu = new ArrayList<>();
    private List<MenuNodeDto> defaults = new ArrayList<>();

    public List<MenuNodeDto> getMenu() {
        return menu;
    }

    public void setMenu(List<MenuNodeDto> menu) {
        this.menu = menu;
    }

    public List<MenuNodeDto> getDefaults() {
        return defaults;
    }

    public void setDefaults(List<MenuNodeDto> defaults) {
        this.defaults = defaults;
    }
}
