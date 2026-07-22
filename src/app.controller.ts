import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: '🚀 KibrisMarket Backend API is Live & Healthy!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
