import { type ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { jsx } from "@oh-my-pi/pi-tui";
import { registerLearnerPlugin } from "./learner.mjs";

export default function ompLearner(pi: ExtensionAPI) {
  pi.setLabel("OMP Learner");
  pi.registerMessageRenderer("learner-status", (message) => {
    if (typeof message.content !== "string") {
      return;
    }

    return jsx("card", {
      head: "Learner Status",
      tone: "info",
      children: jsx("text", {
        text: message.content,
      }),
    });
  });

  registerLearnerPlugin(pi);
}
