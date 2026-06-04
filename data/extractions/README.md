# Stakeholder-extraction artifacts

Drop one extract-then-critic pipeline output JSON per document here (filename =
the pipeline's `doc_id`, e.g. `P0491_35556036532349.json`).

Each file must contain a top-level `work_id` (the Northwestern work UUID, used as
the join key to the IIIF manifest) and an `entries[]` array. The build step only
reads these fields per entry: `entity`, `kind`, `role`, `stance`,
`summary_quote`, `evidence_pages`, and `critic.verdict`.

After adding or updating files, regenerate the published data with:

    npx tsx app/scripts/build-eis-quotes.mts

That writes `assets/eis-quotes.json` (keyed by `work_id`, grouped by stance),
which is served at `/eis-quotes.json` and rendered by the
`EISStakeholderQuotes` component on each work page.

Only entries with a critic verdict of `PASS` or `PASS_WITH_NOTE` are published.

> Note: `P0491_35556036532349.json` here is a condensed sample preserving the
> fields the generator reads. Replace it with the full pipeline artifact.
