import { createAgentSession, SessionManager, z, type ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { getPluginSettings, PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins";
import { registerLearnerPlugin } from "./learner.mjs";

export default function ompLearner(pi: ExtensionAPI) {
  pi.setLabel("OMP Learner");
  registerLearnerPlugin(pi, {
    createAgentSession,
    getPluginSettings,
    setKnowledgeBaseUrl: (cwd, value) => new PluginManager(cwd).setPluginSetting("omp-learner", "knowledgeBaseUrl", value),
    SessionManager,
    z,
  });
}
