class Validator {
  constructor(attributes = {}) {
    this.attributes = attributes;
    this.errors = {};
  }

  validate() {
    return true;
  }
}

module.exports = Validator;
