import { Injectable } from '@nestjs/common';
import { Country, State, City } from 'country-state-city';
import { CountryDto } from './dto/country.dto';
import { StateDto } from './dto/state.dto';
import { CityDto } from './dto/city.dto';

@Injectable()
export class LocationsService {
  getCountries(): CountryDto[] {
    return Country.getAllCountries();
  }

  getStates(countryCode: string): StateDto[] {
    return State.getStatesOfCountry(countryCode);
  }

  getCities(countryCode: string, stateCode: string): CityDto[] {
    return City.getCitiesOfState(countryCode, stateCode);
  }
}
