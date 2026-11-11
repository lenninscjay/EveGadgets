package com.evegadgets.gadgets.webapp.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class FrontendController {
    @RequestMapping(value = "/legacy", method = RequestMethod.GET)
    public String legacy() {
        return "forward:/legacy/index.html";
    }

    @RequestMapping(value = {"/reconstructed", "/reconstructed/index.html"}, method = RequestMethod.GET)
    public String recoveredBookmark() {
        return "forward:/index.html";
    }
}
