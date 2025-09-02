import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CountryDto } from './dto/country.dto';
import { StateDto } from './dto/state.dto';
import { CityDto } from './dto/city.dto';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Locations')
@Controller('locations')
@Public()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Get all countries' })
  @ApiOkResponse({ type: [CountryDto], description: 'List of all countries' })
  getCountries(): CountryDto[] {
    return this.locationsService.getCountries();
  }

  @Get('states')
  @ApiOperation({ summary: 'Get states of a country' })
  @ApiQuery({
    name: 'countryCode',
    required: true,
    example: 'US',
    description: 'ISO code of the country',
  })
  @ApiOkResponse({
    type: [StateDto],
    description: 'List of states for the given country',
  })
  getStates(@Query('countryCode') countryCode: string): StateDto[] {
    return this.locationsService.getStates(countryCode);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Get cities of a state' })
  @ApiQuery({
    name: 'countryCode',
    required: true,
    example: 'US',
    description: 'ISO code of the country',
  })
  @ApiQuery({
    name: 'stateCode',
    required: true,
    example: 'CA',
    description: 'ISO code of the state',
  })
  @ApiOkResponse({
    type: [CityDto],
    description: 'List of cities for the given state',
  })
  getCities(
    @Query('countryCode') countryCode: string,
    @Query('stateCode') stateCode: string,
  ): CityDto[] {
    return this.locationsService.getCities(countryCode, stateCode);
  }
}
