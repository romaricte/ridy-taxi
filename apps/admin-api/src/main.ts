import { NestFactory } from '@nestjs/core';
import { AdminApiModule } from './app/admin-api.module';

async function bootstrap() {
  const app = await NestFactory.create(AdminApiModule);
  await app.listen(process.env.ADMIN_API_PORT || 3004);
}
bootstrap();