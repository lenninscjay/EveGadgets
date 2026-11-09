package org.priceutils.calls;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.ui.ModelMap;

/** Adapts Fuzzwork aggregates to the existing type -> market -> side contract. */
public final class FuzzworkHandler {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private FuzzworkHandler() {}

    public static String requestUrl(List<Integer> types, int market) {
        StringBuilder url = new StringBuilder("https://market.fuzzwork.co.uk/aggregates/?region=");
        // Fuzzwork explicitly accepts region, system or station IDs in region.
        url.append(market).append("&types=");
        for (Integer type : new LinkedHashSet<Integer>(types)) {
            if (url.charAt(url.length() - 1) != '=') url.append(',');
            url.append(type);
        }
        return url.toString();
    }

    public static ModelMap getMarketStatDisplays(List<Integer> types, List<Integer> markets) throws IOException {
        ModelMap result = new ModelMap();
        for (Integer market : new LinkedHashSet<Integer>(markets)) {
            HttpURLConnection connection = (HttpURLConnection) new URL(requestUrl(types, market)).openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(10000);
            connection.setRequestProperty("User-Agent", "EveGadgets-localhost/1.0");
            connection.setRequestProperty("Accept", "application/json");
            try {
                if (connection.getResponseCode() != 200) throw new IOException("Market provider HTTP " + connection.getResponseCode());
                try (InputStream input = connection.getInputStream()) {
                    merge(result, MAPPER.readTree(input), types, market);
                }
            } finally {
                connection.disconnect();
            }
        }
        return result;
    }

    public static void merge(ModelMap result, JsonNode data, List<Integer> types, int market) throws IOException {
        for (Integer type : types) {
            JsonNode item = data.get(type.toString());
            if (item == null) throw new IOException("Missing market type " + type);
            Map<String, Object> sides = new LinkedHashMap<String, Object>();
            sides.put("buy", side(item.get("buy")));
            sides.put("sell", side(item.get("sell")));
            @SuppressWarnings("unchecked")
            Map<Integer, Object> locations = (Map<Integer, Object>) result.get(type.toString());
            if (locations == null) {
                locations = new LinkedHashMap<Integer, Object>();
                result.put(type.toString(), locations);
            }
            locations.put(market, sides);
        }
    }

    private static Map<String, Object> side(JsonNode side) throws IOException {
        if (side == null || number(side, "orderCount") <= 0) throw new IOException("No market orders available");
        Map<String, Object> values = new LinkedHashMap<String, Object>();
        String[][] fields = {{"wavg","weightedAverage"},{"median","median"},{"percentile","percentile"},
            {"min","min"},{"max","max"},{"stdDev","stddev"}};
        for (String[] field : fields) values.put(field[0], number(side, field[1]));
        try {
            values.put("volume", new java.math.BigDecimal(side.get("volume").asText()).longValueExact());
        } catch (RuntimeException ex) { throw new IOException("Invalid market volume", ex); }
        return values;
    }

    private static double number(JsonNode node, String key) throws IOException {
        try {
            double value = Double.parseDouble(node.get(key).asText());
            if (Double.isNaN(value) || Double.isInfinite(value) || value < 0) throw new NumberFormatException(key);
            return value;
        } catch (RuntimeException ex) { throw new IOException("Invalid market field " + key, ex); }
    }
}
