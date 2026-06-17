import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ScanService {
  private readonly mockFilePath = path.join(process.cwd(), 'test.json');

  getMockScanCard() {
    if (!fs.existsSync(this.mockFilePath)) {
      throw new NotFoundException(`Mock file not found: ${this.mockFilePath}`);
    }

    try {
      const raw = fs.readFileSync(this.mockFilePath, 'utf8');
      return JSON.parse(raw || '{}');
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to read mock scan data: ${error?.message || error}`,
      );
    }
  }
}
