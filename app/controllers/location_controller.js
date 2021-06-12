const { Controller } = require('./controller');

class LocationController extends Controller {
  async search(req, res) {
    const { text } = req.query;

    const locationService = await this.getService('location_service');
    const locations = await locationService.search(text);

    res.json(locations);
  }

  async cities(req, res) {
    const { countryId } = req.query;

    const locationService = await this.getService('location_service');
    const locations = await locationService.getCitiesForCountry(countryId);

    res.json(locations);
  }
}

module.exports = LocationController;
