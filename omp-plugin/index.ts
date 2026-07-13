import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { registerLearnerPlugin } from "./learner.mjs";

export default function ompLearner(pi: ExtensionAPI) {
  pi.setLabel("OMP Learner");
  registerLearnerPlugin(pi);
}
