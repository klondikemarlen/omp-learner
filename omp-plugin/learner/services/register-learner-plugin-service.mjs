import BaseService from '../lib/base-service.mjs';
import LearnerStoreRepository from '../repositories/learner-store-repository.mjs';
import RegisterLearnerSessionEventsService from './register-learner-session-events-service.mjs';
import RegisterLearnerSlashCommandService from './register-learner-slash-command-service.mjs';
import RegisterLearnerToolService from './register-learner-tool-service.mjs';

export class RegisterLearnerPluginService extends BaseService {
  constructor(pi, storeRepository = new LearnerStoreRepository()) {
    super();
    this.pi = pi;
    this.storeRepository = storeRepository;
  }

  perform() {
    RegisterLearnerToolService.perform(this.pi, this.storeRepository);
    RegisterLearnerSessionEventsService.perform(this.pi, this.storeRepository);
    RegisterLearnerSlashCommandService.perform(this.pi, this.storeRepository);
  }
}

export default RegisterLearnerPluginService;
