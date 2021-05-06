const bcrypt = require('bcrypt')
const { ENV } = require('./config/config')

const currentTimeMs = () => Date.now()

const mapByKey = (a, key) => {
  const result = {}
  for (const i of a) {
    result[i[key]] = i
  }

  return result
}

const timeAgo = (time) => {
  const now = parseInt(currentTimeMs() / 1000)
  let d = now - parseInt(time / 1000)
  if (d < 60) {
    return {
      key: 'few seconds ago'
    }
  }

  d = Math.floor(d / 60)
  if (d < 60) {
    return {
      key: `MINUTE${1 < d ? 'S' : ''}_AGO`,
      d
    }
  }

  d = Math.floor(d / 60)
  if (d < 24) {
    return {
      key: `HOUR${1 < d ? 'S' : ''}_AGO`,
      d
    }
  }

  d = Math.floor(d / 24)
  if (d < 7) {
    return {
      key: `DAY${1 < d ? 'S' : ''}_AGO`,
      d
    }
  }

  d = Math.floor(d / 7)
  if (d < 4) {
    return {
      key: `WEEK${1 < d ? 'S' : ''}_AGO`,
      d
    }
  }

  d = Math.floor(d / 4)
  if (d < 4) {
    return {
      key: `MONTH${1 < d ? 'S' : ''}_AGO`,
      d
    }
  }

  d = Math.floor(d / 12)
  if (d < 12) {
    return {
      key: `YEAR${1 < d ? 'S' : ''}`,
      d
    }
  }
}

const calculateAge = (birthday) => {
  const ageDifMs = Date.now() - birthday.getTime()
  const ageDate = new Date(ageDifMs)

  return Math.abs(ageDate.getUTCFullYear() - 1970)
}

const hash = async (text) => {
  return bcrypt.hash(text, 10)
}

const compareHash = async (text, hash) => {
  return bcrypt.compare(text, hash)
}

const isProd = () => 'production' === ENV

module.exports = {
  currentTimeMs,
  mapByKey,
  timeAgo,
  calculateAge,
  hash,
  compareHash,
  isProd,
}
