# EveGadgets — localhost PI revival

A local revival of Kurt Midas's Planetary Interaction planner. The app retains its Java/Spring Boot and AngularJS architecture, updates PI volumes for Viridian, and retrieves prices from Fuzzwork instead of Eve Central.

## Run on Windows, macOS or Linux

Install Docker Desktop (Windows: use the WSL 2/Linux-container backend) or Docker Engine with the Compose plugin. An IDE, Java, Maven, Node.js, Python and a separately installed MySQL server are **not required** for the Docker path. Git is optional: downloading and extracting this branch as a ZIP also works.

From the repository directory in PowerShell or a terminal:

```sh
docker compose up --build
```

Wait for MySQL initialization and the Spring `Started Application` message, then open **http://localhost:8080/**. The first build needs internet access to download images and Maven dependencies; live prices always need internet access to `market.fuzzwork.co.uk`. PI reference data is included in the repository.

The app binds to loopback only. MySQL has no host port. Compose uses deliberately local-only credentials. This retains end-of-life frameworks for compatibility and is **not a public deployment configuration**.

To stop, press Ctrl+C, then optionally run `docker compose down`. Saved setups survive shutdown/rebuilds in the `eve-data` named volume. Do **not** run `docker compose down -v` unless you intend to delete all saved setups. Initialization SQL runs only on a new database volume. Export important setups as JSON before changing databases.

If MySQL initialization stopped partway through, restart with a fresh Compose project to
retry the bundled SQL while preserving the original volumes. Run `docker compose down`
then `docker compose -p evegadgets-recovery up --build`. Use that same project name for
subsequent starts and stops. The new project has its own database and cache, so setups
saved in the original project will remain there. Python is only needed to regenerate the
bundled SQL from the upstream data, not to initialize MySQL.

If the database is healthy but `/planetary` returns HTTP 500, rebuild with the current
code. The application must package Connector/J 8 (`com.mysql:mysql-connector-j`);
the old Maven coordinates let Spring Boot downgrade downstream modules to 5.1.34,
which cannot load the configured `com.mysql.cj.jdbc.Driver`. This repair does not
require reseeding or deleting an already healthy database.

Keep using the same Compose project name (for example `evegadgets-recovery2`): plain
`docker compose up` selects a different database volume. To collect a complete error,
run the following from the repository, replacing the project name if necessary:

```sh
docker compose -p evegadgets-recovery2 ps
curl -sS -w '\nHTTP %{http_code}\n' http://localhost:8080/planetary
docker compose -p evegadgets-recovery2 logs --no-color app > app-error.log
docker compose -p evegadgets-recovery2 logs --no-color db > db-error.log
```

Keep the beginning of the exception and all `Caused by:` lines; a short log tail can
omit the cause. The homepage and `/legacy` use the same `/planetary` endpoint.


Docker Desktop needs virtualization/WSL 2 available on Windows. Practical allowance: several GB of disk for images/build caches and roughly 2–4 GB of available memory for Docker and the build (not measured requirements). Your 32 GB desktop should have ample capacity. Port 8080 must be free; if necessary change only the host side of `127.0.0.1:8080:8080` in `compose.yaml`.

## Scope and behavior

- Storage was already correct: storage facilities 12,000 m³, launchpads 10,000 m³, command centers 500 m³.
- PI volumes P0–P4: 0.005, 0.19, 0.75, 3, 50 m³. Quantities and tax base values are not halved.
- Basic-factory inputs now scale to an hour using their 30-minute cycle, matching output normalization.
- `/priceAPI` preserves the type → location → buy/sell response shape. Supports Fuzzwork weighted average, median, percentile, minimum and maximum. The old unweighted `avg` is unavailable.
- Older saved `fivePercent` choices migrate to `percentile`; `avg` migrates to weighted average with a warning. Fuzzwork percentile is presented under its own name; identical methodology to Eve Central is not assumed.
- Missing types, empty order books, invalid numbers, timeouts and provider failures return HTTP 502 with an unavailable-prices message, not zero prices. A request currently needs orders on both buy and sell sides.
- Price requests batch all relevant types per market (maximum 100 types and two locations per request). Refreshes replace the complete result instead of dropping cached types.
- Saved links use the current origin. Export price choices round-trip under `em` (legacy `ex` JSON is accepted).
- The included database supports **PI only**. The legacy Scrap gadget remains in the source but needs additional SDE tables (`invGroups`, `invTypeMaterials`, and a complete `invTypes`) and separate validation. Do not treat Scrap as supported by this local seed.

## Data provenance / regeneration

`sql/local-init/01-pi-data.sql` contains 83 PI commodities and 68 production schematics (203 input/output rows), extracted from Fuzzwork's dated conversion of CCP's EVE Online Static Data Export:

https://www.fuzzwork.co.uk/dump/3670638_20261104_133007/csv/

Planet/resource mappings come from the repository's original `sql/planetaryResourceTypeMap_rabbit.sql`. This is a fixed snapshot, not an automatic live SDE update. EVE Online game data belongs to its respective rights holders.

Optional maintainer regeneration (Python 3, standard library only):

```sh
python scripts/generate-pi-seed.py
```

The generator prints source SHA-256 hashes and validates PI item counts, recipe counts and current tier volumes. Review data/schema differences before changing the pinned source. Regeneration does not update an existing database volume.

## Develop without Docker

Use a JDK 8 and Maven 3.9.x, plus a MySQL 8 database. Create an `evegadgets` database, import `sql/local-init/01-pi-data.sql`, `02-planets.sql`, `03-setups.sql` in that order, and set `DB_URL`, `DB_USER`, `DB_PASSWORD` for your database. `DB_DRIVER` is optional; defaults to `com.mysql.cj.jdbc.Driver`.

```sh
mvn clean verify
java -jar webapp/target/webapp-1.0.jar --server.address=127.0.0.1
```

The root Maven reactor builds all modules; the Boot plugin packages the executable JAR and WRO4J builds the JS/CSS bundles. Serving `src/main/resources/static` directly is insufficient. Java 17 is not the supported runtime for this revival.

Optional planner regression checks (Node.js):

```sh
node scripts/test-planner.js
```

Maven tests cover Fuzzwork parsing (including market volumes beyond 32-bit integer range), absent data and empty orders, plus the real seed/MyBatis mappings and large setup persistence using test-only H2 in MySQL mode. H2 tests do not replace a MySQL/Docker smoke test.

## Manual smoke test

1. Add a planet, one storage facility and one basic Water factory; no extractor. Confirm 12,000 m³ storage, 30 m³/hour imports, 7.6 m³/hour exports, and 400 hours of calculated runtime.
2. Fetch prices for Jita or The Forge. Change import and export statistics independently and compare planet totals with global totals.
3. Save as URL, reload the URL, and confirm the setup and price-statistic choices survive. Also export/import JSON.
4. Stop/restart the containers and confirm the saved URL still works.
5. Disconnect internet and refresh prices: an unavailable/stale warning should appear.

## Original project

Original author: Kurt Midas. Original project: https://github.com/Kurt-Midas/EveGadgets

The original MIT license remains in `LICENSE`.

## Market API courtesy policy

Fuzzwork recommends fetching aggregates in bulk and reusing them locally:
https://market.fuzzwork.co.uk/api/

The API page does not state a numeric aggregate-request quota. Our 30-minute lifetime is an application policy, not a claimed provider limit.

- On PI session initialization, warm the default selected market with all 83 PI type IDs in one request. A newly selected market loads on first price use.
- Cache raw aggregate responses in the Java server for 30 minutes, shared across browser tabs and sessions. Requested PI subsets all use the same cache entry; missing/empty item data does not cause repeated upstream requests.
- Refresh on the first use after expiration, not with an idle background timer. The refresh button cannot bypass the cache. Each distinct region/system is a separate provider request.
- Serialize cache misses to prevent simultaneous requests from duplicating a fetch. Retain at most 64 entries.
- On network/provider failures, apply a process-wide five-minute cooldown. Honor longer `Retry-After` values (seconds or HTTP date). No automatic retry loops, and expired prices are not silently served as current.
- The cache, absolute expiry timestamps and provider cooldown are persisted atomically to `data/market-cache.json` (override with `MARKET_CACHE_FILE`). Docker stores this in the `market-cache` named volume, surviving container restarts and rebuilds. A restart does not reset the interval. Removing volumes with `down -v` deletes the cache. Separate app instances must use separate cache files; this is a single-server design. If cache storage is corrupt/unwritable, requests fail rather than repeatedly bypassing persistence. Static PI recipes and volumes never require market API lookups.
- The legacy Scrap path can include non-PI types, producing a separate batch/cache key; the above one-batch behavior is for the supported PI planner.

Tests use an injected clock and fake provider to verify all-83 batching, cache reuse, expiration, separate locations, simultaneous callers, and provider cooldown without making network requests.

### Reconstructed eve-pi.com interface

The default planner at http://localhost:8080/ reconstructs **Omarus Nagibatus's** archived interface.
It preserves the current PI dataset, corrected cargo volumes, Fuzzwork integration,
persistent market cache, and saved-setup database. The classic utility is available at http://localhost:8080/legacy.
See [reconstruction notes](docs/eve-pi-reconstruction.md) for provenance, differences,
validation limits and local checks. Historic eve-pi.com save IDs cannot be recovered.

The reconstruction also provides **JSON backup / restore**: download a setup file,
or paste/open JSON and select **Replace setup from JSON**. This works independently
of server saves and preserves the compact format used by the classic planner.
Keep downloaded files somewhere safe. Updating the app does not require deleting
Docker volumes; use `docker compose up --build` without `down -v`.

The JSON menu includes a **Broadcast Node template** for the full P0→P4 chain
(12 planets, target one node/hour). Extractors have editable **Total yield/hr**
estimates, initially 12,000; the overview reports P0 shortfalls and surpluses.
Adjust the template's extraction estimates or cover the indicated deficits with imports.
