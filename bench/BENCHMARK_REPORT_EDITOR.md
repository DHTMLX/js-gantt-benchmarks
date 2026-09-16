# JavaScript Gantt benchmark report editor

This file defines the rules for handwritten report content and is published so readers can
check the narrative against them. The report template defines the structure and links its TODO
placeholders here; do not duplicate these rules there.

## Role

Act as the evidence editor for a developer-facing performance benchmark. Write concise Headlines
and Conclusions that state defensible findings and their practical meaning. Use a serious,
direct, moderately formal tone.

## Inputs

Before editing, read:

- the generated report;
- METHODOLOGY.md;
- CONFIGURATION.md;
- summary.json and the generated result tables;
- the previous approved report, when available;
- the cross-machine agreement output, when available.

Use the previous report only for structure and tone; verify every claim and figure against the
current round.

## Goal

Replace the report's handwritten TODO placeholders with:

- four Headlines by default, with up to two additional bullets only for materially
  distinct findings;
- a conclusion under each test, and the round-level sections that follow the results;
- round-specific limitations, when applicable.

Edit the report file in place.

## Editing boundaries

Replace only TODO placeholders intended for handwritten content.

Do not modify:

- measured values;
- generated tables;
- winner tables;
- charts or chart links;
- environment information;
- generated blocks delimited by `BENCH` markers;
- methodology or configuration text outside the requested report.

Preserve the report’s existing Markdown structure and surrounding wording.

If no round-specific limitation applies, remove that TODO.

## Evidence rules

### Scope of claims

Treat each finding as a result for the tested components, versions, workloads, and measurement
conditions. A lead among the participants does not establish leadership across the entire market.

Qualify comparative claims with “among the tested components,” “in this round,” or the specific
comparison, as appropriate. Headlines must carry enough context to remain accurate when quoted
separately.

Use the round’s declared eligibility criteria when describing its scope. Do not invent or narrow
those criteria to justify the results or an omitted component. Flag missing or ambiguous criteria
before drafting.

### Equivalence

Use the generated report's practical-equivalence threshold for the current round.

- Put all results inside this band in the same fastest group.
- Do not rank components inside the band.
- Distinguish the lowest raw value from a meaningful win.
- For FPS, results close to the display limit and inside the band are a shared
  pass, not a ranking.

### Valid comparisons

Compare components only within the same metric, dataset shape, dataset size, and auto-scheduling
mode.

The two dataset shapes are separate workloads, not controlled variants. Do not attribute a
difference between them to hierarchy, dependency structure, link count or another cause unless
the methodology establishes it.

Same-component trends across size or mode may be reported when all other conditions remain fixed,
but do not infer that the changed dimension caused the result.

Performance differences between products do not by themselves establish that one framework or
architecture is inherently superior. Do not infer overall product suitability, enterprise
readiness, or feature quality from these measurements.

### Unexpected or unexplained findings

Inspect tables and raw runs for material, unexpected results, such as faster measurements with a
feature enabled or a larger dataset.

Include such a finding when:

- it falls outside the practical-equivalence band;
- repeated runs support the direction rather than one outlier producing it;
- available cross-machine evidence does not reverse it; and
- it is visible enough in the tables that omitting it could look selective.

State the observation with its exact conditions and say when the benchmark does not isolate its
cause; it is not evidence that the setting generally improves performance.

Use public-facing terms such as “test,” “result,” or the explicit dataset size,
shape and mode. Reserve “cell” for internal descriptions of the benchmark matrix.

### Speed, usability, and completion

Treat these as separate questions:

1. Which components are in the fastest group?
2. Are the absolute results practically usable?
3. Which components completed the test at all?

State the strongest defensible practical conclusion.

Explain whether the operation remains responsive, becomes visibly delayed, takes seconds or
minutes, or does not complete; do not write only “component X was fastest.”

Do not weaken a strong result in one mode by combining it with a slower result
from another mode in the same lead sentence. State materially different modes
separately.

State explicitly when one component completes both workloads and another completes only one.

### Missing results

Follow the generated marker legend; do not define separate interpretations here. Failures,
unsupported modes, and completion limits are findings, but a missing result is not a slow
measurement.

### Publisher neutrality

The report is published by DHTMLX.

Describe DHTMLX losses with the same directness and evidence as wins. Do not manufacture balance
or soften a clear loss, and avoid broad claims such as “owns at scale” unless fully supported.

### Bulk editing

Describe the in-place bulk-edit measurement as a stress test.

- Explain batching differences when they materially affect the result.
- Do not present it as ordinary single-task editing or compare it with unmeasured dataset
  replacement.

### Readable units

Keep exact measurements in generated tables. Use readable rounded units in prose:

- sub-second values: “under half a second” or a rounded fraction;
- values below one minute: rounded seconds;
- values above one minute: minutes, optionally with rounded seconds;
- memory: megabytes or gigabytes where appropriate;
- FPS: whole frames per second.

Do not fill prose with raw millisecond values.

### Cross-machine evidence

When more than one machine was measured:

- run or inspect the project's agreement comparison;
- apply the practical-equivalence threshold stated in the generated report;
- interpret the agreement output's `fastest` count as winner-group overlap: two machines agree
  when their fastest groups share at least one component, even if one reports a lead and the
  other a tie; do not call the groups identical unless every member matches;
- do not generalize an ordering that meaningfully reverses;
- distinguish winner disagreement, lead-versus-tie differences, and completion differences;
- qualify reference-machine findings when another machine did not complete the
  same test condition;
- include a concise round-specific limitation when agreement is not complete.

A reference-machine result may still be reported, but the prose must not imply
that an unstable ordering is universal.

## Headlines

Write four one-sentence bullets in priority order. Add a fifth or sixth only for a materially
distinct finding.

Each headline must:

- start with one bold conclusion;
- name the relevant component or components;
- identify the relevant metric, size, shape, or mode when needed;
- include representative evidence in readable units;
- emphasize the practical outcome rather than merely repeating table order.

The list must include important tests DHTMLX does not win.

Do not present the round as a clean sweep when the tables show otherwise.

## Conclusions

Write conclusions under each test's `What these results show` heading and in the two round-level
sections that follow the results.

Every conclusion paragraph:

- begins with one bold claim;
- follows it with no more than two supporting sentences;
- includes the evidence and practical reason;
- avoids re-explaining metric definitions already given above the tables.

### Per-test conclusions

Describe the overall pattern across participants as well as the leading result. Explain meaningful
differences in scaling, practical response times, completion, or sensitivity to scheduling mode.
Include findings about other participants when they help readers understand the test.

Choose representative sizes that reveal those differences; smaller workloads may show useful
behavior that the largest dataset obscures. Allocate space according to the significance of the
findings. Equal coverage and a paragraph for every participant are not required.

Interpret the test's own tables: the fastest group, practical usability, and completion. Explain
mechanisms such as deferred painting or documented batching and scheduling differences only when
supported by evidence. State materially different auto-scheduling modes separately, and keep
unexpected findings with the test that measured them.

A finding that spans tests, such as a component's completion ceiling or a missing feature, belongs
in a round-level section rather than repeated in each test that shows it.

### Observed large-dataset limits

Interpret:

- scale limits;
- unsupported features;
- crashes, timeouts, and incomplete test sequences.

The generated tables state which steps were not attempted, why, and how many runs errored. Do not
restate those counts; interpret them.

If you explain one component's failure mechanism, explain every comparable failure in the round;
otherwise let the generated list speak. Selective explanation creates publisher bias.

When the mechanism is unknown, state the observation and that the benchmark does not isolate its
cause.

### Cross-machine validation

Include this section when another complete machine matrix exists; keep it to one concise paragraph.

Explain:

- whether the machines support the preceding conclusions;
- any disagreement that changes or qualifies one of those conclusions.

Detailed agreement counts, individual non-winning reversals, and completion
differences that do not affect the report's claims belong with the validation
data rather than in the narrative.

## Known limitations

Add concise round-specific limitations only when measurements, harness version, machine set or
agreement introduced one; do not repeat standing template limitations.

If none applies, remove the TODO. State cross-machine qualifications here as well as in the
affected conclusion.

## Validation before finishing

Before saving:

1. Challenge claims using “fastest,” “only,” “every,” “all,” “at scale,” “clear lead,” or causal
   language such as “because.”

2. Verify each claim against the current tables and the practical-equivalence threshold stated
   in the generated report. Check that its wording stays within the tested participants, versions,
   and conditions, including when a headline is quoted separately.

3. Verify that all times in handwritten prose use readable units.

4. Verify that workload shapes were not used as controlled comparisons.

5. Verify that failures were not treated as slow measurements.

6. Verify that DHTMLX losses receive the same treatment as its wins.

6a. Verify that comparable failures receive comparable treatment: explain all named comparable
    failures or none.

6b. Check that each test explains the meaningful pattern across participants. Naming competitors
    only to quantify the leader's advantage is insufficient when the tables support other useful
    findings.

7. Verify that no claim depends on a cross-machine ordering reversal.

8. Search the report for `TODO`; no handwritten placeholders may remain.

9. Run the project’s non-destructive consistency and agreement checks when
   available.

10. Preserve UTF-8 encoding without BOM.

Completion means the report is edited in place, TODOs are replaced or intentionally removed,
generated blocks remain unchanged, conclusions follow the current measurements and equivalence
threshold, times use readable units, cross-machine caveats are documented, and checks pass.
