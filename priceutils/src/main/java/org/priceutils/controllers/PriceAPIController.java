package org.priceutils.controllers;

import java.io.IOException;
import java.util.Arrays;
import org.priceutils.calls.FuzzworkHandler;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/priceAPI")
public class PriceAPIController {
    @RequestMapping(value="/test", method=RequestMethod.GET)
    public String testEndpoint() { return "priceAPI endpoint works"; }

    @RequestMapping(value="", method=RequestMethod.GET)
    public ResponseEntity<ModelMap> getPriceMap(
            @RequestParam(value="type") Integer[] types,
            @RequestParam(value="system", defaultValue="30000142") Integer[] systems) {
        if (types.length == 0 || types.length > 100 || systems.length == 0 || systems.length > 2) {
            return error("Request must contain 1-100 types and 1-2 locations", HttpStatus.BAD_REQUEST);
        }
        for (Integer type : types) if (type == null || type <= 0) return error("Invalid type", HttpStatus.BAD_REQUEST);
        for (Integer system : systems) if (system == null || system <= 0) return error("Invalid location", HttpStatus.BAD_REQUEST);
        try {
            return new ResponseEntity<ModelMap>(FuzzworkHandler.getMarketStatDisplays(Arrays.asList(types), Arrays.asList(systems)), HttpStatus.OK);
        } catch (IOException ex) {
            return error("Market prices unavailable; retry later", HttpStatus.BAD_GATEWAY);
        }
    }
    private ResponseEntity<ModelMap> error(String message, HttpStatus status) {
        return new ResponseEntity<ModelMap>(new ModelMap("error", message), status);
    }
}
