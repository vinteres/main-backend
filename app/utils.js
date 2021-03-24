const bcrypt = require('bcrypt')

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
    return 'few seconds ago'
  }

  d = Math.floor(d / 60)
  if (d < 60) {
    return `${d} minute${1 < d ? 's' : ''} ago`
  }

  d = Math.floor(d / 60)
  if (d < 24) {
    return `${d} hour${1 < d ? 's' : ''} ago`
  }

  d = Math.floor(d / 24)
  if (d < 7) {
    return `${d} day${1 < d ? 's' : ''} ago`
  }

  d = Math.floor(d / 7)
  if (d < 4) {
    return `${d} week${1 < d ? 's' : ''} ago`
  }

  d = Math.floor(d / 4)
  if (d < 4) {
    return `${d} month${1 < d ? 's' : ''} ago`
  }

  d = Math.floor(d / 12)
  if (d < 12) {
    return `${d} year${1 < d ? 's' : ''} ago`
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

module.exports = {
  currentTimeMs,
  mapByKey,
  timeAgo,
  calculateAge,
  hash,
  compareHash,
}
