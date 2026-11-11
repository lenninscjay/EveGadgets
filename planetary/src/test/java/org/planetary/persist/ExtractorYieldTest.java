package org.planetary.persist;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Test;
import static org.junit.Assert.*;

/** The server must retain custom and zero yields in saved setup JSON. */
public class ExtractorYieldTest {
    @Test public void retainsCustomAndZeroYield() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        for (double yield : new double[]{12500.5,0}) {
            ExtractorSetupContainer original = mapper.readValue(
                "{\"r\":2268,\"h\":5,\"y\":" + yield + "}", ExtractorSetupContainer.class);
            ExtractorSetupContainer restored = mapper.readValue(
                mapper.writeValueAsString(original), ExtractorSetupContainer.class);
            assertEquals(Double.valueOf(yield),restored.getY());
            assertEquals(Integer.valueOf(2268),restored.getR());
        }
    }
    @Test public void acceptsLegacySetupWithoutYield() throws Exception {
        ExtractorSetupContainer legacy = new ObjectMapper().readValue(
            "{\"r\":2268,\"h\":5}", ExtractorSetupContainer.class);
        assertNull(legacy.getY()); // Frontend supplies the documented 12,000 default.
    }
}
