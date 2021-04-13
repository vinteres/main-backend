const Validator = require('./validator')

class SignUpValidator extends Validator {
  validate() {
    if ('string' !== typeof this.attributes.name || '' === this.attributes.name.length) {
      this.errors.name = { invalid: true }
    }
    if (!/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(this.attributes.password)) {
      this.errors.password = { invalid: true }
    }

    return 0 === Object.keys(this.errors).length
  }
}

module.exports = SignUpValidator
