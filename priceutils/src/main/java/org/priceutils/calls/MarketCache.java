package org.priceutils.calls;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.util.*;
import java.util.function.LongSupplier;

/** Process-wide cache: refresh is demand-driven; no background polling. */
final class MarketCache {
    static final long TTL = 30 * 60 * 1000L;
    static final long BACKOFF = 5 * 60 * 1000L;
    interface Loader { JsonNode load(List<Integer> types, int market) throws IOException; }
    static final class ProviderException extends IOException {
        final String retryAfter;
        ProviderException(String retryAfter) { super("Market provider unavailable"); this.retryAfter = retryAfter; }
    }
    private final Loader loader;
    private final LongSupplier clock;
    private final Set<Integer> piTypes = new TreeSet<Integer>();
    private final Map<String, Entry> entries = new LinkedHashMap<String, Entry>();
    private long retryAt;
    private final java.nio.file.Path file;
    private IOException storageError;
    private static final class Entry {
        final JsonNode data; final long expires;
        Entry(JsonNode data, long expires) { this.data=data; this.expires=expires; }
    }
    MarketCache(Loader loader, LongSupplier clock) {
        this(loader, clock, null);
    }
    MarketCache(Loader loader, LongSupplier clock, java.nio.file.Path file) {
        this.loader=loader; this.clock=clock; this.file=file;
        try (Scanner scanner = new Scanner(MarketCache.class.getResourceAsStream("/pi-type-ids.txt"), "UTF-8")) {
            for (String id : scanner.nextLine().split(",")) piTypes.add(Integer.valueOf(id));
        }
        try { readDisk(); } catch(IOException ex) {storageError=ex;}
    }
    private void readDisk() throws IOException {
        if (file == null || !java.nio.file.Files.exists(file)) return;
        JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(file.toFile());
        if (root == null || !root.has("entries") || !root.has("retryAt")) throw new IOException("Invalid persisted market cache");
        retryAt=root.get("retryAt").asLong();
        Iterator<Map.Entry<String, JsonNode>> fields=root.get("entries").fields();
        while(fields.hasNext()) {
            Map.Entry<String, JsonNode> field=fields.next(); JsonNode value=field.getValue();
            if(!value.has("expires") || !value.has("data")) throw new IOException("Invalid cache entry");
            entries.put(field.getKey(),new Entry(value.get("data"),value.get("expires").asLong()));
        }
    }
    private void saveDisk() throws IOException {
        if(file==null) return;
        java.nio.file.Files.createDirectories(file.toAbsolutePath().getParent());
        com.fasterxml.jackson.databind.ObjectMapper mapper=new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.node.ObjectNode root=mapper.createObjectNode();
        root.put("retryAt",retryAt);
        com.fasterxml.jackson.databind.node.ObjectNode values=root.putObject("entries");
        for(Map.Entry<String,Entry> e:entries.entrySet()) {
            com.fasterxml.jackson.databind.node.ObjectNode value=values.putObject(e.getKey());
            value.put("expires",e.getValue().expires);value.set("data",e.getValue().data);
        }
        java.nio.file.Path temp=java.nio.file.Files.createTempFile(file.toAbsolutePath().getParent(),"market-", ".tmp");
        try {
            mapper.writeValue(temp.toFile(),root);
            java.nio.file.Files.move(temp,file.toAbsolutePath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING,java.nio.file.StandardCopyOption.ATOMIC_MOVE);
        } finally {java.nio.file.Files.deleteIfExists(temp);}
    }
    // Serialize misses so simultaneous tabs share one provider request.
    synchronized JsonNode get(List<Integer> requested, int market) throws IOException {
        if(storageError!=null) throw new IOException("Market cache storage unavailable",storageError);
        Set<Integer> all = new TreeSet<Integer>(piTypes);
        all.addAll(requested);
        String key=market+":"+all.toString();
        long now=clock.getAsLong();
        Entry entry=entries.get(key);
        if(entry!=null && now<entry.expires) return entry.data;
        if(now<retryAt) throw new IOException("Provider cooldown active");
        try {
            JsonNode data=loader.load(new ArrayList<Integer>(all),market);
            if(entries.size()>=64 && !entries.containsKey(key)) entries.remove(entries.keySet().iterator().next());
            entries.put(key,new Entry(data,clock.getAsLong()+TTL));
            saveDisk();
            return data;
        } catch(IOException ex) {
            long delay=BACKOFF;
            if(ex instanceof ProviderException) {
                String header=((ProviderException)ex).retryAfter;
                if(header!=null) {
                    try { delay=Math.max(delay,Math.multiplyExact(Long.parseLong(header.trim()),1000L)); }
                    catch(RuntimeException ignored) {
                        try { delay=Math.max(delay,java.time.ZonedDateTime.parse(header,java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli()-clock.getAsLong()); }
                        catch(RuntimeException invalidDate) { /* default cooldown */ }
                    }
                }
            }
            retryAt=clock.getAsLong()+delay;
            try { saveDisk(); } catch(IOException failure) {storageError=failure;}
            throw ex;
        }
    }
}
