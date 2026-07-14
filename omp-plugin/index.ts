import { createAgentSession, SessionManager, z, type ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { getPluginSettings } from "@oh-my-pi/pi-coding-agent/extensibility/plugins";
import { registerLearnerPlugin } from "./learner.mjs";

export default function ompLearner(pi: ExtensionAPI) {
  pi.setLabel("OMP Learner");
  registerLearnerPlugin(pi, { createAgentSession, getPluginSettings, SessionManager, z });
}
