package org.servicelayer.factory;

import java.io.Reader;

import org.apache.ibatis.io.Resources;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.session.SqlSessionFactoryBuilder;

public class MyBatisConnectionFactory {

	private static SqlSessionFactory sessionFactory;
	
	static{
		try{
			String resource = "MyBatisConfig.xml";
			Reader reader = Resources.getResourceAsReader(resource);
			if(sessionFactory == null){
				sessionFactory = new SqlSessionFactoryBuilder().build(reader, databaseProperties());
			}
		}catch(Exception e){throw new ExceptionInInitializerError(e);}
	}
	
	private static java.util.Properties databaseProperties() {
        java.util.Properties props = new java.util.Properties();
        String[][] keys = {{"database.driver", "DB_DRIVER"}, {"database.url", "DB_URL"},
            {"database.user", "DB_USER"}, {"database.password", "DB_PASSWORD"}};
        for (String[] key : keys) {
            String value = System.getenv(key[1]);
            if (value != null) props.setProperty(key[0], value);
        }
        return props;
    }
    public static SqlSessionFactory getSqlSessionFactory(){
		return sessionFactory;
	}
}
