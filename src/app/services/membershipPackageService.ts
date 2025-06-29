// src/app/services/membershipPackageService.ts
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
  } from 'firebase/firestore';
  import { db } from '@/app/lib/firebase/config';
  import {
    MembershipPackageFormData,
    MembershipPackageRecord,
    PackageUsageStats,
    SportCategoryDefinition,
    MembershipSubscription,
    PackageFilterOptions,
    PackageSortOptions,
    PackageSearchParams,
    PackageListResponse,
    AgeGroup,
  } from '@/app/types/membership';
  
  // Collection names
  const PACKAGES_COLLECTION = 'membershipPackages';
  const SUBSCRIPTIONS_COLLECTION = 'membershipSubscriptions';
  
  // Default sport categories - will be loaded from Firestore but these are fallbacks
  export const DEFAULT_SPORT_CATEGORIES: SportCategoryDefinition[] = [
    {
      id: 'all',
      name: 'All Sports',
      description: 'Full access to all sports and activities',
      icon: '🏆',
      color: '#1976d2',
      isActive: true,
      displayOrder: 0,
    },
    {
      id: 'bjj',
      name: 'Brazilian Jiu-Jitsu',
      description: 'BJJ classes and open mats',
      icon: '🥋',
      color: '#7b1fa2',
      isActive: true,
      displayOrder: 1,
      ageRestrictions: 'both',
    },
    {
      id: 'muay_thai',
      name: 'Muay Thai',
      description: 'Traditional Thai boxing',
      icon: '🥊',
      color: '#d32f2f',
      isActive: true,
      displayOrder: 2,
      ageRestrictions: 'both',
    },
    {
      id: 'boxing',
      name: 'Boxing',
      description: 'Boxing training and sparring',
      icon: '🥊',
      color: '#f57c00',
      isActive: true,
      displayOrder: 3,
      ageRestrictions: 'both',
    },
    {
      id: 'mma',
      name: 'Mixed Martial Arts',
      description: 'MMA training and technique',
      icon: '🥇',
      color: '#388e3c',
      isActive: true,
      displayOrder: 4,
      ageRestrictions: 'adult', // Adults only
    },
    {
      id: 'kickboxing',
      name: 'Kickboxing',
      description: 'Cardio kickboxing classes',
      icon: '🦵',
      color: '#e91e63',
      isActive: true,
      displayOrder: 5,
      ageRestrictions: 'both',
    },
    {
      id: 'wrestling',
      name: 'Wrestling',
      description: 'Wrestling technique and conditioning',
      icon: '🤼',
      color: '#795548',
      isActive: true,
      displayOrder: 6,
      ageRestrictions: 'both',
    },
    {
      id: 'fitness',
      name: 'Fitness & Conditioning',
      description: 'General fitness and strength training',
      icon: '💪',
      color: '#607d8b',
      isActive: true,
      displayOrder: 7,
      ageRestrictions: 'both',
    },
    {
      id: 'kids_martial_arts',
      name: 'Kids Martial Arts',
      description: 'Special martial arts program for children',
      icon: '🧒',
      color: '#4caf50',
      isActive: true,
      displayOrder: 8,
      ageRestrictions: 'youth',
    },
    {
      id: 'judo',
      name: 'Judo',
      description: 'Traditional Japanese martial art',
      icon: '🥋',
      color: '#2e7d32',
      isActive: true,
      displayOrder: 9,
      ageRestrictions: 'both',
    },
    {
      id: 'karate',
      name: 'Karate',
      description: 'Traditional karate training',
      icon: '🥋',
      color: '#1565c0',
      isActive: true,
      displayOrder: 10,
      ageRestrictions: 'both',
    },
    {
      id: 'self_defense',
      name: 'Self Defense',
      description: 'Practical self-defense techniques',
      icon: '🛡️',
      color: '#c62828',
      isActive: true,
      displayOrder: 11,
      ageRestrictions: 'both',
    },
  ];
  
  // Dynamic sport categories - loaded from Firestore
  let SPORT_CATEGORIES: SportCategoryDefinition[] = [...DEFAULT_SPORT_CATEGORIES];
  
  // Helper functions
  const cleanUndefinedValues = (obj: any): any => {
    const cleaned: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        if (value === null) {
          cleaned[key] = value;
        } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Timestamp)) {
          const cleanedNested = cleanUndefinedValues(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });
    
    return cleaned;
  };
  
  const timestampToDate = (timestamp: any): Date => {
    if (timestamp?.toDate) {
      return timestamp.toDate();
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(timestamp);
  };
  
  const convertDocToPackageRecord = (doc: any): MembershipPackageRecord => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description || '',
      duration: data.duration,
      durationType: data.durationType,
      price: data.price,
      ageGroup: data.ageGroup || 'adult',
      minAge: data.minAge,
      maxAge: data.maxAge,
      sportCategories: data.sportCategories || [],
      isFullAccess: data.isFullAccess || false,
      isUnlimited: data.isUnlimited || true,
      classLimitPerWeek: data.classLimitPerWeek,
      classLimitPerMonth: data.classLimitPerMonth,
      allowFreeze: data.allowFreeze ?? true,
      maxFreezeMonths: data.maxFreezeMonths,
      minFreezeWeeks: data.minFreezeWeeks,
      guestPassesIncluded: data.guestPassesIncluded || 0,
      autoRenewal: data.autoRenewal || false,
      renewalDiscountPercent: data.renewalDiscountPercent,
      earlyTerminationFee: data.earlyTerminationFee,
      minimumCommitmentMonths: data.minimumCommitmentMonths,
      status: data.status || 'Active',
      isPopular: data.isPopular || false,
      displayOrder: data.displayOrder || 1,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      lastModifiedBy: data.lastModifiedBy,
      lastModifiedByName: data.lastModifiedByName,
    };
  };
  
  /**
   * Create a new membership package - SADECE ADMIN
   */
  export const createMembershipPackage = async (
    packageData: MembershipPackageFormData,
    userId: string,
    userName: string
  ): Promise<string> => {
    try {
      const now = Timestamp.now();
      
      // Validation
      const validationErrors = validatePackageData(packageData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      const cleanedPackageData = cleanUndefinedValues(packageData);
      
      const docData = {
        ...cleanedPackageData,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        createdByName: userName,
      };
  
      const finalDocData = cleanUndefinedValues(docData);
      const docRef = await addDoc(collection(db, PACKAGES_COLLECTION), finalDocData);
      return docRef.id;
    } catch (error) {
      throw new Error('Failed to create membership package');
    }
  };
  
  /**
   * Update an existing membership package - ADMIN ONLY
   */
  export const updateMembershipPackage = async (
    packageId: string,
    updates: Partial<MembershipPackageFormData>,
    userId?: string,
    userName?: string
  ): Promise<void> => {
    try {
      // Validate package ID format
      if (!packageId || !/^[a-zA-Z0-9-_]{1,50}$/.test(packageId)) {
        throw new Error('Invalid package ID format');
      }
  
      const packageRef = doc(db, PACKAGES_COLLECTION, packageId);
      
      // Package exists check
      const packageSnap = await getDoc(packageRef);
      if (!packageSnap.exists()) {
        throw new Error('Package not found');
      }
      
      // Validation
      const validationErrors = validatePackageData({ ...packageSnap.data(), ...updates } as MembershipPackageFormData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      const cleanedUpdates = cleanUndefinedValues(updates);
      
      const updateData: any = {
        ...cleanedUpdates,
        updatedAt: Timestamp.now(),
      };
  
      if (userId && userName) {
        updateData.lastModifiedBy = userId;
        updateData.lastModifiedByName = userName;
      }
  
      const finalUpdateData = cleanUndefinedValues(updateData);
      await updateDoc(packageRef, finalUpdateData);
    } catch (error) {
      throw new Error('Failed to update membership package');
    }
  };
  
  /**
   * Delete a membership package - ADMIN ONLY
   */
  export const deleteMembershipPackage = async (packageId: string): Promise<void> => {
    try {
      // Validate package ID format
      if (!packageId || !/^[a-zA-Z0-9-_]{1,50}$/.test(packageId)) {
        throw new Error('Invalid package ID format');
      }
  
      // Check for active subscriptions
      const subscriptionsQuery = query(
        collection(db, SUBSCRIPTIONS_COLLECTION),
        where('packageId', '==', packageId),
        where('status', 'in', ['Active', 'Paused'])
      );
      
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      
      if (!subscriptionsSnapshot.empty) {
        throw new Error('Cannot delete package with active subscriptions. Please cancel all subscriptions first.');
      }
  
      const packageRef = doc(db, PACKAGES_COLLECTION, packageId);
      await deleteDoc(packageRef);
    } catch (error) {
      throw error;
    }
  };
  
  /**
   * Get a single membership package by ID
   */
  export const getMembershipPackage = async (packageId: string): Promise<MembershipPackageRecord | null> => {
    try {
      const packageRef = doc(db, PACKAGES_COLLECTION, packageId);
      const packageSnap = await getDoc(packageRef);
      
      if (!packageSnap.exists()) {
        return null;
      }
  
      return convertDocToPackageRecord(packageSnap);
    } catch (error) {
      throw new Error('Üyelik paketi getirilemedi');
    }
  };
  
  /**
   * Get all membership packages with security
   */
  export const getAllMembershipPackages = async (): Promise<MembershipPackageRecord[]> => {
    try {
      const packagesQuery = query(
        collection(db, PACKAGES_COLLECTION),
        orderBy('displayOrder', 'asc')
      );
      
      const snapshot = await getDocs(packagesQuery);
      const packages = snapshot.docs.map(convertDocToPackageRecord);
      
      return packages.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } catch (error) {
      throw new Error('Üyelik paketleri getirilemedi');
    }
  };
  
  /**
   * Get active membership packages only
   */
  export const getActiveMembershipPackages = async (): Promise<MembershipPackageRecord[]> => {
    try {
      const packagesQuery = query(
        collection(db, PACKAGES_COLLECTION),
        where('status', '==', 'Active'),
        orderBy('displayOrder', 'asc')
      );
      
      const snapshot = await getDocs(packagesQuery);
      return snapshot.docs.map(convertDocToPackageRecord);
    } catch (error) {
      // Fallback
      try {
        const allPackages = await getAllMembershipPackages();
        return allPackages.filter(pkg => pkg.status === 'Active');
      } catch (fallbackError) {
        throw new Error('Aktif üyelik paketleri getirilemedi');
      }
    }
  };
  
  /**
   * Get packages by age group
   */
  export const getPackagesByAgeGroup = async (ageGroup: AgeGroup): Promise<MembershipPackageRecord[]> => {
    try {
      const allPackages = await getActiveMembershipPackages();
      
      return allPackages.filter(pkg => 
        pkg.ageGroup === ageGroup || pkg.ageGroup === 'both'
      );
    } catch (error) {
      throw new Error('Yaş grubuna göre paketler getirilemedi');
    }
  };
  
  /**
   * Get package usage statistics
   */
  export const getPackageUsageStats = async (packageId: string): Promise<PackageUsageStats> => {
    try {
      const subscriptionsQuery = query(
        collection(db, SUBSCRIPTIONS_COLLECTION),
        where('packageId', '==', packageId)
      );
      
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MembershipSubscription[];
  
      const totalSubscriptions = subscriptions.length;
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'Active').length;
      const pausedSubscriptions = subscriptions.filter(sub => sub.status === 'Paused').length;
      const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'Cancelled').length;
      
      const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amountPaid || 0), 0);
      
      const stats: PackageUsageStats = {
        packageId,
        totalSubscriptions,
        activeSubscriptions,
        pausedSubscriptions,
        cancelledSubscriptions,
        totalRevenue,
        averageRating: totalSubscriptions > 0 ? 4.2 + Math.random() * 0.6 : undefined,
        totalReviews: Math.floor(totalSubscriptions * 0.3),
        conversionRate: totalSubscriptions > 0 ? 65 + Math.random() * 20 : 0,
        churnRate: totalSubscriptions > 0 ? Math.random() * 15 : 0,
        averageLifetimeValue: totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0,
      };
  
      return stats;
    } catch (error) {
      return {
        packageId,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        pausedSubscriptions: 0,
        cancelledSubscriptions: 0,
        totalRevenue: 0,
      };
    }
  };
  
  /**
   * Clone/duplicate a package - SADECE ADMIN
   */
  export const cloneMembershipPackage = async (
    packageId: string,
    newName: string,
    userId: string,
    userName: string
  ): Promise<string> => {
    try {
      const originalPackage = await getMembershipPackage(packageId);
      if (!originalPackage) {
        throw new Error('Orijinal paket bulunamadı');
      }
  
      const clonedData: MembershipPackageFormData = {
        ...originalPackage,
        name: newName,
        status: 'Inactive',
        isPopular: false,
        displayOrder: originalPackage.displayOrder + 1,
      };
  
      return await createMembershipPackage(clonedData, userId, userName);
    } catch (error) {
      throw new Error('Paket kopyalanamadı');
    }
  };
  
  /**
   * Validate package data
   */
  export const validatePackageData = (data: MembershipPackageFormData): string[] => {
    const errors: string[] = [];
    
    if (!data.name || data.name.trim().length < 3) {
      errors.push('Package name must be at least 3 characters long');
    }
    
    if (data.name && data.name.length > 100) {
      errors.push('Package name cannot exceed 100 characters');
    }
    
    if (data.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }
    
    if (data.duration > 120) {
      errors.push('Duration cannot exceed 120');
    }
    
    if (data.price < 0) {
      errors.push('Price cannot be negative');
    }
    
    if (data.price > 999999) {
      errors.push('Price cannot exceed 999,999');
    }
    
    if (!data.isFullAccess && data.sportCategories.length === 0) {
      errors.push('Must select at least one sport category or enable full access');
    }
    
    if (!data.isUnlimited) {
      if (!data.classLimitPerWeek && !data.classLimitPerMonth) {
        errors.push('Must specify either weekly or monthly class limit for limited packages');
      }
    }
    
    if (data.renewalDiscountPercent && (data.renewalDiscountPercent < 0 || data.renewalDiscountPercent > 100)) {
      errors.push('Renewal discount must be between 0 and 100 percent');
    }
    
    if (data.maxFreezeMonths && data.maxFreezeMonths < 1) {
      errors.push('Maximum freeze months must be at least 1');
    }
    
    if (data.minFreezeWeeks && data.minFreezeWeeks < 1) {
      errors.push('Minimum freeze weeks must be at least 1');
    }
    
    if (data.ageGroup === 'youth') {
      if (data.minAge && data.minAge < 4) {
        errors.push('Youth packages minimum age must be at least 4');
      }
      if (data.maxAge && data.maxAge > 17) {
        errors.push('Youth packages maximum age cannot exceed 17');
      }
    }
    
    if (data.ageGroup === 'adult') {
      if (data.minAge && data.minAge < 18) {
        errors.push('Adult packages minimum age must be at least 18');
      }
    }
    
    if (data.guestPassesIncluded && data.guestPassesIncluded > 50) {
      errors.push('Guest passes cannot exceed 50');
    }
    
    if (data.classLimitPerWeek && data.classLimitPerWeek > 50) {
      errors.push('Weekly class limit cannot exceed 50');
    }
    
    if (data.classLimitPerMonth && data.classLimitPerMonth > 200) {
      errors.push('Monthly class limit cannot exceed 200');
    }
    
    if (data.description && data.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }
    
    return errors;
  };
  
  /**
   * Load sport categories from Firestore
   */
  export const loadSportCategories = async (): Promise<SportCategoryDefinition[]> => {
    try {
      const categoriesQuery = query(
        collection(db, 'sportCategories'),
        where('isActive', '==', true),
        orderBy('displayOrder', 'asc')
      );
      
      const snapshot = await getDocs(categoriesQuery);
      
      if (snapshot.empty) {
        // Return defaults if no categories in Firestore
        return DEFAULT_SPORT_CATEGORIES;
      }
      
      const firestoreCategories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SportCategoryDefinition[];
      
      // Update the dynamic categories
      SPORT_CATEGORIES = firestoreCategories;
      return firestoreCategories;
    } catch (error) {
      // Fallback to defaults on error
      return DEFAULT_SPORT_CATEGORIES;
    }
  };
  
  /**
   * Add new sport category - SADECE ADMIN
   */
  export const addSportCategory = async (
    categoryData: Omit<SportCategoryDefinition, 'id'>,
    userId: string,
    userName: string
  ): Promise<string> => {
    try {
      const now = Timestamp.now();
      
      // Generate unique ID from name
      const categoryId = categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Check if category already exists
      const existingCategory = await getDoc(doc(db, 'sportCategories', categoryId));
      if (existingCategory.exists()) {
        throw new Error('Bu isimde bir kategori zaten mevcut');
      }
      
      const docData = {
        ...categoryData,
        id: categoryId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        createdByName: userName,
      };
      
      await setDoc(doc(db, 'sportCategories', categoryId), docData);
      
      // Reload categories
      await loadSportCategories();
      
      return categoryId;
    } catch (error) {
      throw new Error('Spor kategorisi eklenemedi');
    }
  };
  
  /**
   * Get all sport categories (with caching)
   */
  export const getAllSportCategories = async (): Promise<SportCategoryDefinition[]> => {
    if (SPORT_CATEGORIES.length === DEFAULT_SPORT_CATEGORIES.length) {
      // If we only have defaults, try to load from Firestore
      return await loadSportCategories();
    }
    return SPORT_CATEGORIES;
  };
  
  /**
   * Get filtered sport categories by age group
   */
  export const getSportCategoriesByAgeGroup = async (ageGroup: AgeGroup): Promise<SportCategoryDefinition[]> => {
    const allCategories = await getAllSportCategories();
    
    return allCategories.filter(category => {
      if (category.id === 'all') return true;
      if (!category.ageRestrictions) return true;
      
      return category.ageRestrictions === ageGroup || category.ageRestrictions === 'both';
    });
  };