class RequestTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RequestTimeoutError';
    Object.setPrototypeOf(this, RequestTimeoutError.prototype);
  }
}

module.exports = RequestTimeoutError;
