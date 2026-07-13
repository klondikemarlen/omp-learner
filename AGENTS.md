# OMP Learner Agent Guidance

## Release and install verification

- The release mechanism is merge to `main`; do not claim a separate npm publish or marketplace release without recorded remote evidence.
- After the merge is reachable on GitHub, run `omp plugin install github:klondikemarlen/omp-learner --force`.
- Confirm `omp plugin list --json` reports an enabled `omp-learner` plugin with `./omp-plugin/index.ts`.
- Reload the plugin if OMP supports it, otherwise restart OMP. In a fresh session, run `/learner status` to prove the installed extension registered its command.
- Report the installation command and fresh-session result; local package checks do not prove the released plugin is installed.
