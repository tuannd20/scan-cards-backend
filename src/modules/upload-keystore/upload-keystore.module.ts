import { Module } from '@nestjs/common';
import { UploadKeystoreController } from './upload-keystore.controller';

@Module({
  controllers: [UploadKeystoreController],
})
export class UploadKeystoreModule {}
