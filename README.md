# EveGadgets — localhost PI revival

A local revival of Kurt Midas's Planetary Interaction planner. The app retains its Java/Spring Boot and AngularJS architecture, updates PI volumes for Viridian, and retrieves prices from Fuzzwork instead of Eve Central.

## Run on Windows, macOS or Linux

Install Docker Desktop (Windows: use the WSL 2/Linux-container backend) or Docker Engine with the Compose plugin. An IDE, Java, Maven, Node.js, Python and a separately installed MySQL server are **not required** for the Docker path. Git is optional: downloading and extracting this branch as a ZIP also works.

From the repository directory in PowerShell or a terminal:

```sh
docker compose up --build
```

Wait for MySQL initialization and the Spring `Started Application` message, then open **http://localhost:8080/#/pi**. The first build needs internet access to download images and Maven dependencies; live prices always need internet access to `market.fuzzwork.co.uk`. PI reference data is included in the repository.

The app binds to loopback only. MySQL has no host port. Compose uses deliberately local-only credentials. This retains end-of-life frameworks for compatibility and is **not a public deployment configuration**.

To stop, press Ctrl+C, then optionally run `docker compose down`. Saved setups survive shutdown/rebuilds in the `eve-data` named volume. Do **not** run `docker compose down -v` unless you intend to delete all saved setups. Initialization SQL runs only on a new database volume. Export important setups as JSON before changing databases.

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
