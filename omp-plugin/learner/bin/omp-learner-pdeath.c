#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/prctl.h>
#include <sys/types.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
  if (argc < 3) {
    fputs("usage: omp-learner-pdeath <parent-pid> <command> [args...]\n", stderr);
    return 64;
  }

  char *end = NULL;
  errno = 0;
  const long value = strtol(argv[1], &end, 10);
  if (errno || !end || *end || value <= 1) {
    fputs("omp-learner-pdeath: invalid parent pid\n", stderr);
    return 64;
  }

  const pid_t parent_pid = (pid_t)value;
  if (prctl(PR_SET_PDEATHSIG, SIGKILL) == -1) {
    perror("omp-learner-pdeath: PR_SET_PDEATHSIG");
    return 70;
  }

  if (getppid() != parent_pid) return 125;

  execvp(argv[2], &argv[2]);
  perror("omp-learner-pdeath: exec");
  return 127;
}
