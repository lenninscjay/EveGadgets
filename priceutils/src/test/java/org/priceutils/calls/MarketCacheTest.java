package org.priceutils.calls;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import com.fasterxml.jackson.databind.ObjectMapper;

public class MarketCacheTest {
    @Test public void batchesAllPiAndRefreshesOnlyAfterExpiry() throws Exception {
        final AtomicLong now=new AtomicLong(1000); final AtomicInteger calls=new AtomicInteger();
        MarketCache cache=new MarketCache((types,market)->{assertEquals(83,types.size());calls.incrementAndGet();return new ObjectMapper().createObjectNode();},now::get);
        cache.get(Collections.<Integer>emptyList(),10000002);
        cache.get(Arrays.asList(2268,2393),10000002);
        now.addAndGet(MarketCache.TTL-1);cache.get(Arrays.asList(2393),10000002);assertEquals(1,calls.get());
        now.incrementAndGet();cache.get(Arrays.asList(2393),10000002);assertEquals(2,calls.get());
        cache.get(Arrays.asList(2393),30000142);assertEquals(3,calls.get());
    }
    @Test public void simultaneousTabsShareOneRequest() throws Exception {
        final AtomicInteger calls=new AtomicInteger();
        MarketCache cache=new MarketCache((types,market)->{calls.incrementAndGet();return new ObjectMapper().createObjectNode();},()->0L);
        ExecutorService pool=Executors.newFixedThreadPool(8);
        try {
            List<Future<?>> jobs=new ArrayList<Future<?>>();
            for(int i=0;i<20;i++)jobs.add(pool.submit(()->{try{cache.get(Arrays.asList(2268),10000002);}catch(Exception ex){throw new RuntimeException(ex);}}));
            for(Future<?> job:jobs)job.get();
            assertEquals(1,calls.get());
        } finally {pool.shutdownNow();}
    }
    @Test public void honorsRetryAfterAcrossMarkets() throws Exception {
        final AtomicInteger calls=new AtomicInteger();final AtomicLong now=new AtomicLong();
        MarketCache cache=new MarketCache((types,market)->{calls.incrementAndGet();throw new MarketCache.ProviderException("3600");},now::get);
        for(int i=0;i<2;i++){try{cache.get(Arrays.asList(2268),10000002+i);fail();}catch(java.io.IOException expected){}}
        assertEquals(1,calls.get());now.set(3599999);
        try{cache.get(Arrays.asList(2268),10000002);fail();}catch(java.io.IOException expected){}
        assertEquals(1,calls.get());now.incrementAndGet();
        try{cache.get(Arrays.asList(2268),10000002);fail();}catch(java.io.IOException expected){}
        assertEquals(2,calls.get());
    }
    @Test public void restartPreservesExpiryAndCooldown() throws Exception {
        java.nio.file.Path file=java.nio.file.Files.createTempDirectory("cache-test").resolve("prices.json");
        AtomicLong now=new AtomicLong(1000);AtomicInteger calls=new AtomicInteger();
        MarketCache.Loader loader=(types,market)->{calls.incrementAndGet();return new ObjectMapper().createObjectNode();};
        new MarketCache(loader,now::get,file).get(Arrays.asList(2268),10000002);
        now.addAndGet(1000);
        new MarketCache(loader,now::get,file).get(Arrays.asList(2393),10000002);assertEquals(1,calls.get());
        now.set(1000+MarketCache.TTL);
        new MarketCache(loader,now::get,file).get(Arrays.asList(2393),10000002);assertEquals(2,calls.get());
        MarketCache.Loader fail=(types,market)->{calls.incrementAndGet();throw new MarketCache.ProviderException("3600");};
        try{new MarketCache(fail,now::get,file).get(Arrays.asList(2268),30000142);fail();}catch(java.io.IOException expected){}
        try{new MarketCache(fail,now::get,file).get(Arrays.asList(2268),30000143);fail();}catch(java.io.IOException expected){}
        assertEquals(3,calls.get());
    }
}
