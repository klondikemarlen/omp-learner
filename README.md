# OMP Learner

OMP Learner is an OMP extension for conservative, human-reviewed triage of durable user feedback about code style, tests, commits, and reusable workflows.

This initial release ports the learner runtime previously bundled with `marlens-skills-rules-and-tools`. The runtime is opt-in through `/learner on`, `/learner off`, and `/learner status`; it records high-confidence pending candidates locally and does not create GitHub issues, open pull requests, or apply rules automatically.

Run its focused verification with:

```bash
npm test
```
