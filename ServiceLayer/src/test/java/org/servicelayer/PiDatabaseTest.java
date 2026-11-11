package org.servicelayer;

import java.io.FileReader;
import java.io.File;
import java.util.Map;
import java.util.LinkedHashMap;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Properties;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.session.SqlSessionFactoryBuilder;
import org.h2.tools.RunScript;
import org.junit.Test;
import static org.junit.Assert.*;
import org.servicelayer.models.*;

/** Exercises the real seed and MyBatis mappings; H2 is test-only, deployment uses MySQL. */
public class PiDatabaseTest {
    @Test public void loadsCompletePiDatasetAndPersistsLargeSetup() throws Exception {
        String url = "jdbc:h2:mem:pi;MODE=MySQL;DB_CLOSE_DELAY=-1";
        try (Connection connection = DriverManager.getConnection(url,"sa","")) {
            for (String file : new String[]{"01-pi-data.sql","02-planets.sql","03-setups.sql"}) {
                try (FileReader reader = new FileReader("../sql/local-init/"+file)) { RunScript.execute(connection,reader); }
            }
        }
        Properties props = new Properties();
        props.setProperty("database.driver","org.h2.Driver");
        props.setProperty("database.url",url);
        props.setProperty("database.user","sa");
        props.setProperty("database.password","");
        SqlSessionFactory factory = new SqlSessionFactoryBuilder().build(Resources.getResourceAsReader("MyBatisConfig.xml"),props);
        SqlSession session = factory.openSession();
        try {
            List<SchematicDomain> recipes = session.selectList("Schematics.getSchematics");
            assertEquals(68,recipes.size());
            Map<Integer,SchematicDomain> recipeMap = new LinkedHashMap<Integer,SchematicDomain>();
            int inputs = 0;
            for (SchematicDomain recipe : recipes) {
                recipeMap.put(recipe.getOutputID(),recipe);
                for (ComponentDomain component : recipe.getRecipe()) {
                    assertTrue("A recipe cannot consume its own output: " + recipe.getName(),
                        recipe.getOutputID() != component.getTypeId());
                    inputs++;
                }
            }
            assertEquals(135,inputs); // 203 input/output rows minus 68 outputs
            assertRecipe(recipeMap.get(2867),1,new int[][]{{2354,6},{17392,6},{17898,6}});
            assertRecipe(recipeMap.get(2354),3,new int[][]{{2329,10},{3697,10}});
            assertRecipe(recipeMap.get(17392),3,new int[][]{{2312,10},{2327,10}});
            assertRecipe(recipeMap.get(17898),3,new int[][]{{2321,10},{9840,10}});
            Map<Integer,ItemDetailsDomain> items = new LinkedHashMap<Integer,ItemDetailsDomain>();
            for (ItemDetailsDomain item : session.<ItemDetailsDomain>selectList("ItemDetails.getPlanetResourceTypeNameTier"))
                items.put(item.getTypeID(),item);
            Map<Integer,PlanetDomain> planets = new LinkedHashMap<Integer,PlanetDomain>();
            for (PlanetDomain planet : session.<PlanetDomain>selectList("Planets.getPlanets")) planets.put(planet.getId(),planet);
            Map<Integer,ResourceDomain> resources = new LinkedHashMap<Integer,ResourceDomain>();
            for (ResourceDomain resource : session.<ResourceDomain>selectList("Planets.getResources")) resources.put(resource.getId(),resource);
            // Feed the actual mapper + Jackson response to the Angular integration test.
            new File("target").mkdirs();
            new ObjectMapper().writeValue(new File("target/pi-api-fixture.json"),
                new FullInfoDomain(recipeMap,planets,resources,null,items));

            assertEquals(83,session.selectList("ItemDetails.getPlanetResourceTypeNameTier").size());
            assertEquals(8,session.selectList("Planets.getPlanets").size());
            PersistPlanetDomain setup = new PersistPlanetDomain();
            setup.setSetup(new String(new char[2048]).replace('\0','x'));
            setup.calculateHashKey();
            session.insert("PlanetPersistence.savePlanet",setup);
            session.commit();
            PersistPlanetDomain loaded = session.selectOne("PlanetPersistence.getPlanet",setup.getHashKey());
            assertEquals(setup.getSetup(), loaded.getSetup());
        } finally { session.close(); }
    }
    private static void assertRecipe(SchematicDomain recipe, int output, int[][] ingredients) {
        assertNotNull(recipe);
        assertEquals(3600,recipe.getCycleTime());
        assertEquals(output,recipe.getOutputQuantity());
        assertEquals(ingredients.length,recipe.getRecipe().size());
        for (int[] expected : ingredients) {
            boolean found = false;
            for (ComponentDomain actual : recipe.getRecipe()) {
                if (actual.getTypeId() == expected[0]) {assertEquals(expected[1],actual.getQuantity()); found = true;}
            }
            assertTrue("Missing ingredient " + expected[0],found);
        }
    }
}
