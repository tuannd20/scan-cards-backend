import { Controller, Get, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScanService } from './scan.service';

@SetMetadata('skipResponse', true)
@ApiTags('scan')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Get('scan-card')
  @ApiOperation({
    summary: 'Return mock scan-card response from test.json',
  })
  getMockScanCard() {
    return this.scanService.getMockScanCard();
  }
}
