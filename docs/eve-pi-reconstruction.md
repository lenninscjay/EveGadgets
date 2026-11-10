# eve-pi.com frontend reconstruction

This opt-in frontend reconstructs the archived eve-pi.com interface associated with
**Omarus Nagibatus**, originally based on **Kurt Midas's EveGadgets**. It uses the
current Java/MySQL backend rather than recreating the unavailable historical server.

After `docker compose up --build`, open:
http://localhost:8080/reconstructed/index.html#/

The classic planner remains at http://localhost:8080/#/pi and links to this interface.
No additional production services, package managers or host installations are needed.

## Recovered and rebuilt

The source inventory in [eve-pi-archive-manifest.json](eve-pi-archive-manifest.json)
records exact Wayback replay URLs and original download sizes. The starting page was
https://web.archive.org/web/20200606230344/http://eve-pi.com/#/ . Recovered assets span
2018–2020; they are not a verified single deployment. The original author attribution
is retained. The manifest records original assets; files under `static/reconstructed`
are adapted derivatives, not byte-for-byte archive copies. Attribution does not
establish a separate license for changes made by the later site operator.

Recovered portions include the planet model, coordinator, navigation, overview,
market and save panels, planet editor, and CSS. The factory editor template was
missing and has been rebuilt. Archived API adapters have been replaced. The old
analytics, missing Scrap scripts and obsolete image requests are removed.

## Progress retained from the localhost revival

- `/planetary` supplies the current seeded data: the archived JSON is not shipped.
  The adapter translates Java field names and resource lists into the recovered model.
- Recipe quantities use `3600 / cycleTime`, including 6,000 P0 inputs per basic
  factory hour. P0–P4 volumes remain 0.005, 0.19, 0.75, 3 and 50 m³.
- Storage remains 12,000 m³, launchpads 10,000 m³ and optional command-center storage
  500 m³. Restrict-to-launchpads remains available.
- `/priceAPI` retains Fuzzwork batching, persistent 30-minute expiry, provider cooldown,
  Retry-After handling, timeouts and the Docker cache volume. An initial warm-up
  covers all 83 PI types for The Forge; subsequent UI requests use that server cache.
  A distinct location has its own batch. Expired data refreshes on demand, with no
  background polling. No browser calls go directly to Fuzzwork.
- Import/export locations, order sides and statistics remain independently selectable.
  Internal transfers are included in the price request even when net system flows cancel.
  `percentile` and `wavg` retain their actual Fuzzwork meanings. Open order volume is
  not presented as daily traded volume.
- Saves use the existing `/persist` endpoints and compact schema in the same MySQL
  database. Classic saves can be opened with their numeric key at
  `/reconstructed/index.html#/<key>`. Newly reconstructed saves also open in the classic
  planner. Command-center storage now has a missing `c` property in the Java DTO.
  Zero tax rates and false flags survive both frontends' load paths. Historical saves
  with omitted market fee fields cannot be distinguished from explicit zero fees by
  the legacy Java primitive fields; these now load as the stored zero values.
- Docker, database seed, schema initialization and market-cache implementation are unchanged.

## Verification and limits

`node scripts/test-planner.js` checks the classic calculations. The reconstruction
check uses the real generated AngularJS bundle and templates in jsdom, with HTTP
fixtures matching the Java API schemas:

```sh
# Run a Maven build first to generate webapp/target/generated-resources/static.
npm install --no-save --package-lock=false jsdom@31.0.0
node scripts/test-reconstructed.js
```

Node 22.22.2+, 24.15.0+ or 26+ (matching jsdom's supported release ranges) is required by this optional jsdom test dependency; Docker hosting does
not require Node. The test checks routing/templates, factory selection/removal,
storage, volumes, hourly rates, independent prices, a single batched client request,
current-origin save links, save/load, prerequisites, and data/price/save/load failures.
It does not simulate provider caching; that remains covered by the existing Java
market-cache tests. Test data is deliberately small and deterministic.

The modified persistence DTO was compiled to Java 8 bytecode with JDK 21's compiler,
and its JSON round-trip was exercised with the application's Jackson 2.4.5 libraries.
The complete Maven reactor and Docker/MySQL stack were not rerun for this change.
Chromium startup was denied by the execution environment, so visual browser layout
and actual Docker behavior still require local checks. This is an opt-in reconstruction,
not a claim to have recovered every feature of the historical site.

Historic eve-pi.com/Mongo save IDs and its database are unavailable. Only locally
saved numeric keys can be loaded. Tax/fee defaults are historical assumptions; enter
your own rates. Planet detail figures are per active hour, while system totals account
for utilization. The original extractor model assumes it supplies the required raw
material; it does not simulate actual extraction yields. Old AngularJS/Spring dependencies
remain suitable only for the previously described localhost scope.

## Local smoke check

1. Start Compose, open the reconstruction, add a planet and a basic Water factory.
2. Enable one storage facility with launchpad-only storage disabled. Confirm 12,000 m³,
   6,000 Aqueous Liquids/hour, 40 Water/hour and a 400-hour modeled runtime.
3. Add prerequisite extraction; duplicate/delete planets and try advanced/high-tech
   production. Check CPU/PG overflow turns the bars red and inspect the overview.
4. Open Market Details. Change import/export markets and statistics separately.
   A provider failure must show an error and hide stale price totals.
5. Save, follow the link, and open the same key in the classic planner. Check factories,
   settings, taxes and command-center storage. Restart Compose and reload the link.
6. Verify provider requests in server/network diagnostics: one full PI batch per market
   per cache interval, shared by both frontends, retained across normal Compose restarts.
