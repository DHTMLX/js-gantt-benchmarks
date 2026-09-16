# Publishing a round

Turn a measured store into a published round. Measurement definitions are in
[`METHODOLOGY.md`](METHODOLOGY.md).

`raw-results/` is the live store. Publishing copies it into the round directory; the next round
starts from an empty store so old numbers cannot support new claims.

1. `npm run check`, then `npm run bench` — measure into `raw-results/`.
2. `npm run publish:artefacts` — creates the draft, fills generated blocks, regenerates
   `summary.json` and the README block, copies evidence into `reports/<version>/`, and bundles
   the round as HTML.
3. Fill the `TODO` sections using
   [`bench/BENCHMARK_REPORT_EDITOR.md`](bench/BENCHMARK_REPORT_EDITOR.md). Re-run step 2 after
   prose changes; only generated markers are rewritten. `grep TODO` before step 4.
4. Commit, then tag `v<version>`. The round is final at this point.
5. `npm run prune -- --yes` — clears `raw-results/`, safe once step 2 has copied it and step 4 has
   committed it.
6. Bump `ROUND_VERSION` in `bench/config.mjs`, ready for the next round. Then back to step 1.

Steps 5 and 6 belong to the ending round. `prune` verifies against `reports/<ROUND_VERSION>/`,
so bump only after pruning; while the old version remains active, accidental reporting cannot
overwrite the published snapshot.

The first round starts at step 1, with `ROUND_VERSION` at its initial value and nothing to bump.
`npm run round:new` creates a round's draft on its own, for structuring a round before there are
numbers in it.

The runner never reads `ROUND_VERSION`; rows record library and harness versions, and the round
version is applied only when generating the round.

## Sending a round to someone outside the repository

`reports/<version>/report-v<version>.html` is a self-contained round: the report and its
charts in one file. It is written by `npm run publish:artefacts`, or:

```sh
npm run html                                # every published document of the current round
npm run html -- --round 1.0.0-dhtmlx-history # one round
npm run html -- --all                       # every round under reports/
```

Attach it or print it to PDF. The print stylesheet wraps wide tables; links to the
repository's other documents, `METHODOLOGY.md` and `CONFIGURATION.md` among them, are flattened
to text naming the file.

`--all` also bundles rounds copied into `reports/` by hand, even when their report filename does
not follow `report-v<version>.md`.

The bundle marks two facts on its first screen:

- **A non-semver round version** such as `1.0.0-dhtmlx-history` is marked internal in the banner
  and browser tab; `--internal` forces the marking.
- **A round with `TODO` sections still in it** is marked a draft, counting them, and
  `npm run html` prints the same count. Step 3 above is the step that has not been done yet.

## More than one machine

`REFERENCE_MACHINE` in `bench/config.mjs` selects the numbers used for tables and prose. A
machine's readable name lives in `MACHINE_NAMES` (`bench/machine.mjs`): published output
introduces it by name and keeps the detected id as the pointer to its `raw-results/` directory,
and an unnamed machine publishes that id alone.

Every machine's results ship, so compare their conclusions:

```sh
npm run agree                                        every machine in raw-results/, pairwise
node bench/agreement.mjs Apple-M1-mac i9-11900K-win  two named machines
```

It compares decisions rather than absolute figures: fastest groups, meaningful leads and test
completion. Absolute speed differences are expected.

A contradiction is a claim supported by one machine but not another; re-measure it or omit the
claim.

## Which version to bump

`ROUND_VERSION` (`bench/config.mjs`) versions a **set of measurements**: the `reports/` directory,
report filename, git tag and `summary.json` field. The harness version in `package.json` versions
measurement code and is recorded on every results row.

Anything that can change a number requires at least a minor harness bump (for example, changing
the five-frame/32 ms settle criterion). Patch is for changes that cannot move a figure: generators,
documents and output formatting.

`npm run check` reports, but does not enforce, mixed harness or library versions; the same report
appears before `bench` and `report`. The maintainer decides whether such a store can be published;
`summary.json` preserves the harness versions for review.
