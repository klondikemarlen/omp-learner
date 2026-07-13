export class BaseService {
  static perform(...args) {
    const service = new this(...args);
    return service.perform();
  }

  perform() {
    throw new Error('Not implemented');
  }
}

export default BaseService;
