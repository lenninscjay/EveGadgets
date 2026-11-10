package org.servicelayer;

import java.io.FileReader;
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
}
