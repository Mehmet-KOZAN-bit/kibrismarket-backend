import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../auth/firebase-admin.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createListing(
    userId: string,
    productData: CreateProductDto,
  ) {
    const db = this.firebaseAdminService.getFirestore();
    const userRef = db.collection('users').doc(userId);
    
    return await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new BadRequestException('User profile not found.');
      }

      const userData = userDoc.data();

      // Enforce phone verification at API level for security
      if (userData?.role !== 'admin' && !userData?.isPhoneVerified) {
        throw new BadRequestException(
          'Telefon numaranız doğrulanmamıştır. İlan ekleyebilmek için lütfen telefon numaranızı profil sayfanızdan doğrulayın.',
        );
      }

      const listingLimit = userData?.listingLimit || 10;

      // Count active listings of the user
      const userProductsQuery = db.collection('products')
        .where('sellerId', '==', userId)
        .where('status', '==', 'active');
      
      const userProductsSnap = await transaction.get(userProductsQuery);
      if (userProductsSnap.size >= listingLimit) {
        throw new BadRequestException(
          `İlan sınırına ulaştınız (${listingLimit} adet). Daha fazla eklemek için VIP Dükkana yükseltin.`,
        );
      }

      const newProductRef = db.collection('products').doc();
      const newProduct = {
        id: newProductRef.id,
        ...productData,
        sellerId: userId,
        status: 'pending',
        isPremium: false,
        views: 0,
        favoritesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      transaction.set(newProductRef, newProduct);
      return newProduct;
    });
  }

  async updateListing(userId: string, productId: string, data: { price: number }) {
    const db = this.firebaseAdminService.getFirestore();
    const productRef = db.collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      throw new NotFoundException('İlan bulunamadı.');
    }

    const productData = productDoc.data();
    if (productData?.sellerId !== userId) {
      throw new ForbiddenException('Bu ilanı düzenleme yetkiniz yok.');
    }

    const oldPrice = Number(productData?.price);
    const newPrice = Number(data.price);

    await productRef.update({
      price: newPrice,
      updatedAt: new Date().toISOString(),
    });

    if (newPrice < oldPrice) {
      // Trigger price drop notification
      this.notifyPriceDrop(productId, productData.title, oldPrice, newPrice);
    }

    return { success: true, price: newPrice };
  }

  async notifyPriceDrop(productId: string, productTitle: string, oldPrice: number, newPrice: number) {
    const db = this.firebaseAdminService.getFirestore();
    try {
      const favoritesSnap = await db.collectionGroup('favorites').get();
      const interestedUserIds: string[] = [];

      favoritesSnap.docs.forEach(doc => {
        if (doc.id === productId) {
          const userId = doc.ref.parent.parent?.id;
          if (userId) {
            interestedUserIds.push(userId);
          }
        }
      });

      const title = 'Fiyat Düşüşü Fırsatı! 📉';
      const body = `Favorilerindeki "${productTitle}" ilanının fiyatı ₺${oldPrice} değerinden ₺${newPrice} tutarına düştü!`;

      for (const userId of interestedUserIds) {
        await this.notificationsService.notifyUser(userId, title, body, {
          type: 'price_drop',
          productId,
        });
      }
    } catch (err) {
      console.warn('Error sending price drop notifications:', err);
    }
  }

  async approveListing(productId: string) {
    const db = this.firebaseAdminService.getFirestore();
    const productRef = db.collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      throw new NotFoundException('Listing not found.');
    }

    const productData = productDoc.data();

    await productRef.update({
      status: 'active',
      updatedAt: new Date().toISOString(),
    });

    // Notify seller
    if (productData?.sellerId) {
      try {
        await this.notificationsService.notifyUser(
          productData.sellerId,
          'İlanınız Onaylandı! 🎉',
          `"${productData.title}" ilanınız yöneticiler tarafından onaylandı ve yayına alındı.`,
          {
            type: 'listing_approved',
            productId,
          }
        );
      } catch (err) {
        console.warn('Error sending listing approval notification:', err);
      }
    }

    return { success: true, status: 'active' };
  }

  async rejectListing(productId: string) {
    const db = this.firebaseAdminService.getFirestore();
    const productRef = db.collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      throw new NotFoundException('Listing not found.');
    }

    const productData = productDoc.data();

    await productRef.update({
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });

    // Notify seller
    if (productData?.sellerId) {
      try {
        await this.notificationsService.notifyUser(
          productData.sellerId,
          'İlanınız Onaylanmadı ⚠️',
          `"${productData.title}" ilanınız kriterlere uygun bulunmadığı için reddedildi.`,
          {
            type: 'listing_rejected',
            productId,
          }
        );
      } catch (err) {
        console.warn('Error sending listing rejection notification:', err);
      }
    }

    return { success: true, status: 'rejected' };
  }
}
