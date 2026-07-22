import { Module, Global } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [FirebaseAdminService, AuthGuard, RolesGuard],
  exports: [FirebaseAdminService, AuthGuard, RolesGuard],
})
export class AuthModule {}
