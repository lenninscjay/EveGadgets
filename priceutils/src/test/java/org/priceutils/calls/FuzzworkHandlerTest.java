package org.priceutils.calls;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Arrays;
import org.springframework.ui.ModelMap;

public class FuzzworkHandlerTest {
    private static final String SIDE = "{\"orderCount\":\"2\",\"weightedAverage\":\"4.25\",\"median\":\"4\",\"percentile\":\"3.9\",\"min\":\"3\",\"max\":\"5\",\"stddev\":\"0.5\",\"volume\":\"10024734026.0\"}";
    @Test public void mapsStringNumbersAndBothLocations() throws Exception {
        ModelMap result = new ModelMap();
        String input = "{\"2268\":{\"buy\":"+SIDE+",\"sell\":"+SIDE+"}}";
        for (int location : new int[]{30000142,10000002}) FuzzworkHandler.merge(result,new ObjectMapper().readTree(input),Arrays.asList(2268),location);
        com.fasterxml.jackson.databind.JsonNode json = new ObjectMapper().valueToTree(result);
        assertEquals(4.25,json.path("2268").path("30000142").path("buy").path("wavg").asDouble(),0.0);
        assertEquals(10024734026L,json.path("2268").path("10000002").path("sell").path("volume").asLong());
        assertFalse(json.path("2268").path("30000142").has("all"));
        assertFalse(json.path("2268").path("30000142").path("buy").has("avg"));
    }
    @Test(expected=java.io.IOException.class) public void rejectsMissingTypes() throws Exception {
        FuzzworkHandler.merge(new ModelMap(),new ObjectMapper().readTree("{}"),Arrays.asList(2268),30000142);
    }
    @Test(expected=java.io.IOException.class) public void rejectsEmptyOrders() throws Exception {
        FuzzworkHandler.merge(new ModelMap(),new ObjectMapper().readTree("{\"2268\":{\"buy\":{\"orderCount\":\"0\"}}}"),Arrays.asList(2268),30000142);
    }
    @Test public void batchesAndDeduplicatesTypes() {
        assertEquals("https://market.fuzzwork.co.uk/aggregates/?region=30000142&types=2268,2393", FuzzworkHandler.requestUrl(Arrays.asList(2268,2393,2268),30000142));
    }
}
