import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private ipCache = new Map<string, { count: number; expiresAt: number }>();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute window
  private readonly MAX_LIMIT = 60; // 60 requests per minute

  constructor() {
    // Periodically clean up expired entries from the cache map to prevent memory leak
    setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of this.ipCache.entries()) {
        if (now > record.expiresAt) {
          this.ipCache.delete(ip);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();

    const record = this.ipCache.get(ip);

    if (!record || now > record.expiresAt) {
      this.ipCache.set(ip, {
        count: 1,
        expiresAt: now + this.WINDOW_MS,
      });
      return next();
    }

    record.count++;
    if (record.count > this.MAX_LIMIT) {
      throw new HttpException(
        'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin. (Too many requests, please try again later.)',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
