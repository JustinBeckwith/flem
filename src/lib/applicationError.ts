export default class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
  }
}