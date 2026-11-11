# eve-pi.com frontend reconstruction

The default frontend reconstructs the archived eve-pi.com interface associated with
**Omarus Nagibatus**, originally based on **Kurt Midas's EveGadgets**. It uses the
current Java/MySQL backend rather than recreating the unavailable historical server.

After `docker compose up --build`, open:
http://localhost:8080/

The classic planner remains at http://localhost:8080/legacy and links to this interface.
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
missing and has been rebuilt. Overview icons use CCP's current image service, with
visible commodity names even when images are unavailable. Archived API adapters have been replaced. The old
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
  `/#/<key>` or in the classic planner at `/legacy#/pi/<key>`. The old
  `/reconstructed/index.html#/<key>` and `/#/pi/<key>` bookmarks still work. Command-center storage now has a missing `c` property in the Java DTO.
  Zero tax rates and false flags survive both frontends' load paths. Historical saves
  with omitted market fee fields cannot be distinguished from explicit zero fees by
  the legacy Java primitive fields; these now load as the stored zero values.
- Docker, database seed, schema initialization and market-cache implementation are unchanged.

## Verification and limits

`node scripts/test-planner.js` checks the classic calculations. The reconstruction
check uses the real generated AngularJS bundle and templates in jsdom, with the actual seed/MyBatis/Jackson dataset exported by `PiDatabaseTest`:

```sh
# Run mvn verify first to generate both the asset bundle and
# ServiceLayer/target/pi-api-fixture.json from the database integration test.
npm install --no-save --package-lock=false jsdom@31.0.0
node scripts/test-reconstructed.js
```

Node 22.22.2+, 24.15.0+ or 26+ (matching jsdom's supported release ranges) is required by this optional jsdom test dependency; Docker hosting does
not require Node. The test checks routing/templates, factory selection/removal,
storage, volumes, hourly rates, independent prices, a single batched client request,
current-origin save links, save/load, prerequisites, and data/price/save/load failures.
It does not simulate provider caching; that remains covered by the existing Java
market-cache tests. The recipe dataset is generated from the complete bundled PI seed, not manually
constructed recipe fixtures. Price responses remain deterministic test fixtures.

The modified persistence DTO was compiled to Java 8 bytecode with JDK 21's compiler,
and its JSON round-trip was exercised with the application's Jackson 2.4.5 libraries.
The complete Maven reactor and Docker/MySQL stack were not rerun for this change.
Chromium startup was denied by the execution environment, so visual browser layout
and actual Docker behavior still require local checks. This is an opt-in reconstruction,
not a claim to have recovered every feature of the historical site.

Historic eve-pi.com/Mongo save IDs and its database are unavailable. Only locally
saved numeric keys can be loaded. Tax/fee defaults are historical assumptions; enter
your own rates. Planet detail figures are per active hour, while system totals account
for utilization. Extractor yields are user-entered estimates. The model shows net P0 deficits/surpluses
but does not simulate depletion, extraction cycles, or automatic factory starvation. Old AngularJS/Spring dependencies
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

## JSON backup and restore

Use **JSON backup / restore** in the top bar:

- **Export current setup** puts the setup in a copyable text area.
- **Download current setup (.json)** saves `evegadgets-setup.json` on your computer.
- Open a `.json` file or paste a classic/reconstructed compact JSON export, then
  select **Replace setup from JSON**. This replaces the current planets/settings;
  export first to keep them. Invalid files leave the current setup untouched.
- Import validates commodity IDs, factory tiers, counts, utilization and options.
  The file/text limit is 2 MB. It restores the plan without a database write or
  market lookup; prices refresh when you open Market Details. The app must already
  have loaded its PI dataset. JSON files do not contain price-cache snapshots.

**Save current setup** remains available and stores a database record with a link,
not a new HTML file. Reopening the homepage does not automatically reload that record;
use its saved URL. The configured `eve-data` volume should survive normal restarts and
`docker compose down`. `docker compose down -v`, deleting the volume, or running under
another Compose project name can remove or select a different database. No deletion
or volume reset is required for this update. JSON backups are independent of the
server database and should be kept outside the repository/container.

## Recipe regression correction

The original `Schematics.xml` query joined all schematic rows, including the output,
into the recipe ingredients. Restricting `B.isInput=1` prevents subtracting a product
from itself and prevents **Add prerequisites** from recreating its triggering factory.
There is also a client guard against self-inputs from an old/malformed response.
Repeated clicks still add another set of input factories; this action does not globally
balance or deduplicate factories already assigned to other consumers.

The database test checks all 68 recipes (135 input rows, excluding 68 output rows),
including exact Broadcast Node/P3 ingredient lists. The DOM test uses that serialized
response to verify 20/hour of each required P2 imported, 6/hour of each P3 transferred
between planets, and 1 Broadcast Node/hour exported. It also checks the Neocoms
prerequisite action, JSON downloads/file imports/pasted imports, rejection without
state loss, and readable icon headers. The database test was run with H2/MySQL mode,
not a live MySQL container; Docker/reboot and visual-browser checks remain local.

## Broadcast Node template and extractor estimates

In **JSON backup / restore**, choose **Open Broadcast Node template**, then
**Replace setup from JSON** when ready. Opening it first fills the editor without
replacing your current plan. You can also download the template directly from that
menu. The source is `static/reconstructed/templates/broadcast-node.json`; regenerate
it from the current bundled seed with `python scripts/generate-broadcast-template.py`.

The target is one Broadcast Node per hour, with this arrangement:

| Stage | Planets | Facilities |
|---|---:|---|
| P4 | 1 | 1 high-tech factory for Broadcast Node |
| P3 | 1 | 2 advanced factories each for Neocoms, Data Chips, High-Tech Transmitters |
| P2 | 1 | 4 advanced factories for each of the 6 P2 inputs (24 total) |
| P0/P1 | 9 | One planet per P1 commodity; 4 or 8 basic factories each (48 total), plus an extractor |

The P1 commodities are Biofuels, Precious Metals, Oxidizing Compound, Silicon,
Oxygen, Biomass, Industrial Fibers, Plasmoids and Chiral Structures. The template
starts at command-center level V, one launchpad per planet, and ten heads per
extractor. Tests check modeled CPU/PG fitting and nonempty allowed planet lists;
actual placement/link lengths and extraction rates still need your own adjustment.
It is a multi-character planning example, not a single-character colony allocation.

Every extractor has **Total yield/hr**, default 12,000 P0 units per active planet
hour across all of its heads. Head count affects fitting; it does not derive yield.
Yield can be zero or a nonnegative number. The planet's utilization factor applies
to the resulting flow when computing system averages, as it does for factory flows.
Multiple extractors for the same P0 resource add together.

At the default yields, the template deliberately exposes P0 deficits: six P1 planets
need 24,000 P0/hour and three need 48,000 P0/hour, so each has a 12,000 or 36,000
shortfall. Combined external P0 need is 180,000/hour. Raising each yield to its
factory demand (or importing the deficit) supports the scheduled one-node/hour
output. The overview shows shortages as negative P0 flows and explicit warnings;
surplus extraction appears as positive P0 flow. Factory output is not silently
throttled when extraction is insufficient.

Yield uses the optional compact extractor field `y` and survives JSON/server saves,
planet copies, and passing through the classic save format. Older saves without
`y` default to 12,000; explicit zero stays zero. No database migration is needed.
The reconstructed UI supports editing these estimates; the classic calculation and
save adapter retain them too. Invalid/blank input is flagged and treated as zero
while editing, and invalid imported yield values are rejected.

Validation adds the complete 12-planet template, exact P2/P3/P4 balances, fitting,
P0 deficit/balance/surplus, multiple extractors for one resource, yield edits,
copying, JSON/server round-trips, legacy defaults, and zero/invalid yields. Two
Jackson tests verify that the Java save DTO preserves custom/zero yields and accepts
legacy records. Full Docker/MySQL reboot and visual-browser validation remain local.
