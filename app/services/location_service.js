class LocationService {
  constructor(locationRepository) {
    this.locationRepository = locationRepository
  }

  async getCitiesForCountry(countryId) {
    const cities = await this.locationRepository.findCitiesByCountryId(countryId)
    const country = await this.locationRepository.findCountryById(countryId)

    return cities.map(city => {
      city.name = `${city.name}, ${country.name}`

      return city
    })
  }

  async getCitiesById(cityIds) {
    if (!cityIds || 0 === cityIds.length) return []

    const cities = await this.locationRepository.findCitiesById(cityIds)
    const countries = await this.locationRepository.findCountriesById(cities.map(city => city.country_id))

    return cities.map(city => {
      const country = countries.find(c => c.id === city.country_id)
      city.name = `${city.name}, ${country.name}`

      return city
    })
  }

  async getLocationById(cityId) {
    const city = await this.locationRepository.findCityById(cityId)
    if (!city) return null

    const country = await this.locationRepository.findCountryById(city.country_id)

    city.fullName = `${city.name}, ${country.name}`

    return city
  }

  async search(text) {
    if (2 > text.length) return []

    const cities = await this.locationRepository.search(text)
    const countries = await this.locationRepository.findCountriesById(cities.map(city => city.country_id))

    return cities.map(city => {
      const country = countries.find(country => country.id === city.country_id)
      city.fullName = `${city.name}, ${country.name}`

      return city
    })
  }
}

module.exports = LocationService
