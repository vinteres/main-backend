class InappropriateImageError extends Error {
  constructor() {
    super('Inappropriate image content');

    this.name = 'InappropriateImageError';
  }
}

module.exports = InappropriateImageError;