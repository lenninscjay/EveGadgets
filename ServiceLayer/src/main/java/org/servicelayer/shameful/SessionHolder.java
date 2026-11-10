package org.servicelayer.shameful;
import java.util.List;
import org.apache.ibatis.session.SqlSession;
import org.servicelayer.factory.MyBatisConnectionFactory;
/** Each query owns and closes its session; sessions must not be shared by HTTP threads. */
public final class SessionHolder {
    public static <T> List<T> selectList(String statement) { return selectList(statement, null); }
    public static <T> List<T> selectList(String statement, Object parameter) {
        SqlSession session = MyBatisConnectionFactory.getSqlSessionFactory().openSession();
        try {
            return session.selectList(statement, parameter);
        } finally { session.close(); }
    }
}
