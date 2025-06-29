// src/app/api/sport-categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin } from '@/app/lib/api/middleware';
import { Timestamp } from 'firebase-admin/firestore';

// GET - Tüm spor kategorilerini getir
export async function GET(request: NextRequest) {
  try {
    const categoriesRef = adminDb.collection('sportCategories');
    const snapshot = await categoriesRef
      .where('isActive', '==', true)
      .orderBy('displayOrder', 'asc')
      .get();
    
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Kategoriler getirilemedi' },
      { status: 500 }
    );
  }
}

// POST - Yeni spor kategorisi ekle (Admin only)
export const POST = requireAdmin(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { session } = context;

    // Input validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Kategori adı en az 2 karakter olmalıdır' },
        { status: 400 }
      );
    }

    if (!['adult', 'youth', 'both'].includes(body.ageRestrictions)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz yaş kısıtlaması' },
        { status: 400 }
      );
    }

    // Generate unique ID from name
    const categoryId = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Check if category already exists
    const existingCategory = await adminDb.collection('sportCategories').doc(categoryId).get();
    if (existingCategory.exists) {
      return NextResponse.json(
        { success: false, error: 'Bu isimde bir kategori zaten mevcut' },
        { status: 400 }
      );
    }

    // Get next display order
    const lastCategorySnapshot = await adminDb
      .collection('sportCategories')
      .orderBy('displayOrder', 'desc')
      .limit(1)
      .get();
    
    const nextDisplayOrder = lastCategorySnapshot.empty 
      ? 1 
      : lastCategorySnapshot.docs[0].data().displayOrder + 1;

    const categoryData = {
      id: categoryId,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      icon: body.icon || '🥋',
      color: body.color || '#1976d2',
      ageRestrictions: body.ageRestrictions || 'both',
      isActive: true,
      displayOrder: nextDisplayOrder,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: session.uid,
      createdByName: session.fullName,
    };

    await adminDb.collection('sportCategories').doc(categoryId).set(categoryData);

    return NextResponse.json({
      success: true,
      data: categoryData
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Kategori eklenemedi' },
      { status: 500 }
    );
  }
});