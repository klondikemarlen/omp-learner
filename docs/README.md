# OMP Learner knowledge base

This directory records durable project knowledge for Learner maintainers and reviewers. The [ownership and signal model](architecture/ownership-and-signals.md) describes what Learner owns, when it learns or proposes tracked work, how proposals route, and which evidence supports those boundaries.

## Authority and publication

- Current implementation behavior is defined by [`omp-plugin/learner/config.mjs`](../omp-plugin/learner/config.mjs) and [`omp-plugin/learner/ticket.mjs`](../omp-plugin/learner/ticket.mjs).
- The repository's [`scripts/verify-learner.mjs`](../scripts/verify-learner.mjs) documents and exercises selected behavior; passing tests are evidence only for the covered cases.
- This repository is the publication boundary for these project docs. If a documentation site is added, explicitly allowlist public inputs rather than publishing this tree implicitly.
