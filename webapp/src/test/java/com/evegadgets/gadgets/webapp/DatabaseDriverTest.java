package com.evegadgets.gadgets.webapp;

import java.sql.Driver;
import org.apache.ibatis.datasource.pooled.PooledDataSource;
import org.junit.Test;
import org.servicelayer.factory.MyBatisConnectionFactory;
import static org.junit.Assert.*;

/** Test the final application's dependencies, not just ServiceLayer's classpath. */
public class DatabaseDriverTest {
    @Test public void configuredDriverIsAvailableToWebapp() throws Exception {
        PooledDataSource source = (PooledDataSource) MyBatisConnectionFactory
            .getSqlSessionFactory().getConfiguration().getEnvironment().getDataSource();
        Driver driver = (Driver) Class.forName(source.getDriver()).newInstance();
        assertTrue("Configured JDBC URL must be accepted", driver.acceptsURL(source.getUrl()));
        assertTrue("MySQL 8 driver required", driver.getMajorVersion() >= 8);
    }
}
