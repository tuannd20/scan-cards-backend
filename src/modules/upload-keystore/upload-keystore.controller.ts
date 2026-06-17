import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Delete,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
@Controller('upload-keystore')
export class UploadKeystoreController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './src/keystore';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.endsWith('.p8')) {
          return cb(new Error('Only .p8 files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const relativePath = path.join('src', 'keystore', file.originalname);
    return {
      message: 'File uploaded successfully',
      path: relativePath, 
    };
  }

  @Delete('upload/:filename')
  deleteUploadedFile(@Param('filename') filename: string) {
    if (!filename.endsWith('.p8') || filename.includes('..')) {
      throw new BadRequestException('Invalid file name');
    }

    const filePath = path.join(process.cwd(), 'src', 'keystore', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { message: `Deleted file ${filename}` };
    } else {
      return { message: `File ${filename} does not exist` };
    }
  }
}
