// src/app/api/staff/[id]/route.ts - isActive durumunu değiştirmek için güncellendi
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaffOrTrainer, requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse, forbiddenResponse, conflictResponse } from '@/app/lib/api/response-utils';

// GET /api/staff/[id] - Belirli bir personel üyesini getir
export const GET = requireStaffOrTrainer(async (request: NextRequest, context) => {
  try {
    const { params: asyncParams, session } = context;
    const params = await asyncParams;

    if (!params?.id) {
      return badRequestResponse('Staff ID is required');
    }

    const staffId = params.id as string;

    // Personel belgesini getir
    const staffDoc = await adminDb.collection('staff').doc(staffId).get();

    if (!staffDoc.exists) {
      return notFoundResponse('Staff member');
    }

    // Personel verilerini düzgün bir şekilde tipize et
    const staffData: any = { id: staffDoc.id, ...staffDoc.data() };

    // Yönetici olmayan kullanıcılar sadece kendi profillerini görüntüleyebilir
    if (session.role !== 'admin' && session.uid !== staffId) {
      return forbiddenResponse('Access denied');
    }

    // Yönetici değilse hassas verileri kaldır
    if (session.role !== 'admin') {
      // TypeScript hatalarını önlemek için isteğe bağlı silme kullan
      if (staffData.lastLoginIP) delete staffData.lastLoginIP;
      if (staffData.failedLoginAttempts) delete staffData.failedLoginAttempts;
      if (staffData.accountLockoutUntil) delete staffData.accountLockoutUntil;
      if (staffData.lastFailedLoginAt) delete staffData.lastFailedLoginAt;
      if (staffData.securityFlags) delete staffData.securityFlags;
    }

    return successResponse(staffData);

  } catch (error: any) {
    return errorResponse('Failed to fetch staff member', 500);
  }
});

// PUT /api/staff/[id] - Personel üyesini güncelle
export const PUT = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { params: asyncParams, session } = context;
    const params = await asyncParams;

    if (!params?.id) {
      return badRequestResponse('Staff ID is required');
    }

    const staffId = params.id as string;
    const body = await request.json();

    // Personelin var olup olmadığını kontrol et
    const staffRef = adminDb.collection('staff').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists) {
      return notFoundResponse('Staff member');
    }

    // E-postanın başka bir personel üyesi tarafından kullanılıp kullanılmadığını kontrol et
    if (body.email && body.email !== staffDoc.data()?.email) {
      const existingStaff = await adminDb.collection('staff')
        .where('email', '==', body.email)
        .get();

      if (!existingStaff.empty && existingStaff.docs[0].id !== staffId) {
        return conflictResponse('Email already exists');
      }
    }

    // Denetim alanlarıyla birlikte güncelle
    const updateData: any = {
      ...body,
      updatedBy: session.uid,
      updatedAt: new Date(),
    };

    // Güncellenmemesi gereken alanları kaldır
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await staffRef.update(updateData);

    // Güncellenmiş belgeyi al
    const updatedDoc = await staffRef.get();
    const result: any = { id: updatedDoc.id, ...updatedDoc.data() };

    return successResponse(result, 'Staff member updated successfully');

  } catch (error: any) {
    return errorResponse('Failed to update staff member', 500);
  }
});

// DELETE /api/staff/[id] - Personel üyesinin isActive durumunu değiştir (deactivate/activate)
export const DELETE = requireAdmin(async (request: NextRequest, context) => {
  const { params: asyncParams, session } = context;
  const params = await asyncParams;
  try {
    if (!params?.id) {
      return badRequestResponse('Staff ID is required');
    }

    const staffId = params.id as string;

    // Personelin var olup olmadığını kontrol et
    const staffRef = adminDb.collection('staff').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists) {
      return notFoundResponse('Staff member');
    }

    // Yöneticinin kendi hesabını pasifleştirmesini engelle
    if (staffId === session.uid && staffDoc.data()?.role === 'admin') {
      return badRequestResponse('Administrators cannot deactivate their own accounts directly.');
    }

    // Mevcut isActive durumunu al ve tersine çevir
    const currentIsActive = staffDoc.data()?.isActive ?? true; // Ayarlanmamışsa varsayılan olarak true
    const newIsActive = !currentIsActive;

    // isActive durumunu ve denetim alanlarını güncelle
    await staffRef.update({
      isActive: newIsActive,
      updatedBy: session.uid,
      updatedAt: new Date(),
      // Pasifleştirme/aktifleştirme zaman damgalarını ayarla veya temizle
      ...(newIsActive
        ? { activatedBy: session.uid, activatedAt: new Date(), deactivatedBy: null, deactivatedAt: null }
        : { deactivatedBy: session.uid, deactivatedAt: new Date(), activatedBy: null, activatedAt: null })
    });

    const actionMessage = newIsActive ? 'activated' : 'deactivated';
    return successResponse(null, `Staff member ${actionMessage} successfully`);

  } catch (error: any) {
    console.error(`Error toggling staff status for ${params?.id}:`, error);
    return errorResponse('Failed to update staff member status', 500);
  }
});