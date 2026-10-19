# OMP Learner Maintainer Documentation

This directory documents Learner's own behavior, implementation, and integration contracts for maintainers and reviewers. It is not a store for general knowledge collected from other projects. Maintained reusable learning belongs in the user's configured shared knowledge base, defaulting to [`marlens-skills-rules-and-tools`](https://github.com/klondikemarlen/marlens-skills-rules-and-tools); project-specific knowledge belongs with its owning project. The [ownership and signal model](architecture/ownership-and-signals.md) explains classification, configurable proposal routing, supplied-verifier handoff, and the evidence supporting those boundaries.

## Authority and Publication

- Current implementation behavior is defined by [`config.mjs`](../omp-plugin/learner/config.mjs), [`source.mjs`](../omp-plugin/learner/source.mjs), and [`ticket.mjs`](../omp-plugin/learner/ticket.mjs): advisor policy, authoritative native source inspection, and proposal routing/acknowledgment.
- The repository's [`scripts/verify-learner.mjs`](../scripts/verify-learner.mjs) documents and exercises selected behavior; passing tests are evidence only for the covered cases.
- This repository is the publication boundary for these project docs. If a documentation site is added, explicitly allowlist public inputs rather than publishing this tree implicitly.
