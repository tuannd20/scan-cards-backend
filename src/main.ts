import { Logger } from '@nestjs/common';
import { createConfiguredApp } from './app.factory';

async function bootstrap() {
  const logger = new Logger(bootstrap.name);
  const app = await createConfiguredApp();
  const port = process.env.PORT || 4000;

  await app.listen(port, () =>
    logger.log(`🚀 Server running on: http://localhost:${port}/api-docs`),
  );
}
bootstrap();
