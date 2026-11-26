---
name: investigate-style
description: Use when asked to discover whether existing code supports a tentative style convention or to distinguish competing explanations for an edit. Not for enforcing an accepted rule.
---

# Investigate a style convention

Answer the maintainer’s question in the current conversation. The example that prompted it is a starting point, not independent evidence.

1. State the plausible explanations as predictions. Find a situation where they predict **different** code. For example, “omit the separator when a loop is the only statement in a method” and “omit it when a loop starts its block” agree on a method containing just one loop. They disagree on a loop that starts a nested block and is followed by more work.
2. Inspect a small sample of comparable, pre-existing code in the requested scope. Start with sibling methods or files; read the surrounding block, not just search hits. Exclude the edits under discussion, generated output, and repeated copies of the same example. If a formatter or documented rule settles the layout, identify that evidence separately from discretionary choices.
3. Look specifically for the distinguishing case **and** try to disprove the better-fitting explanation. Stop when you can explain the distinction and its limits, or when the bounded sample runs out. If the necessary code is unavailable, say what you could not inspect.
4. Report **observations** with file and line references: what the cases do, including exceptions. Then give the **inference**: which explanation fits better and why, or which missing case would distinguish them. Examples where both predictions agree do not decide between them. Frequency is not intent; do not attribute a repository’s code to the maintainer without evidence.

A useful default with exceptions is a valid finding. So is “this sample cannot tell.” Neither is adoption: do not edit code, file a proposal, save a preference, or create a lint rule as part of the investigation.
