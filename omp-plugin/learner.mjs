import RegisterLearnerPluginService from './learner/services/register-learner-plugin-service.mjs';

export function registerLearnerPlugin(pi) {
  RegisterLearnerPluginService.perform(pi);
}
