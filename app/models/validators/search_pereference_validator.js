const Validator = require("./validator");

const MIN_AGE = 18
const MAX_AGE = 99

class SearchPereferenceValidator extends Validator {
  validate() {
    if (MIN_AGE > this.attributes.fromAge) {
      this.errors.fromAge = { invalid: true }
    }
    if (MAX_AGE < this.attributes.toAge) {
      this.errors.toAge = { invalid: true }
    }
    if (this.attributes.fromAge > this.attributes.toAge) {
      this.errors.toAge = { invalid: true }
    }
    if (!this.attributes.cityId) {
      this.errors.cityId = { invalid: true }
    }

    return 0 === Object.keys(this.errors).length
  }
}

module.exports = SearchPereferenceValidator
