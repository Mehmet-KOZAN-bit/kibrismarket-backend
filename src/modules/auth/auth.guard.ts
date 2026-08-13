import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing or invalid.');
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      // Decode user ID token using Firebase Admin
      const decodedToken = await this.firebaseAdminService.getAuth().verifyIdToken(idToken);
      
      // Fetch user profile from Firestore to populate roles
      const userDoc = await this.firebaseAdminService
        .getFirestore()
        .collection('users')
        .doc(decodedToken.uid)
        .get();

      const userData = userDoc.exists ? userDoc.data() : null;

      if (userData?.isBanned) {
        throw new UnauthorizedException('This account has been banned by an administrator.');
      }

      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: userData?.role || 'admin',
        displayName: userData?.displayName || decodedToken.email || 'Admin',
      };

      return true;
    } catch (error) {
      console.error('[AuthGuard] Token verification error:', error);
      throw new UnauthorizedException('Invalid or expired Firebase ID token.');
    }
  }
}
