import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestore, Timestamp } from 'firebase/firestore';
import app from '@/app/lib/firebase/config'; // Assuming app is the default export
import {
  MembershipPlanFormData,
  MembershipPlan,
} from '@/app/types/membership';

const db = getFirestore(app);

// Locally defined types based on reported missing exports from membership.ts
export type AgeGroup = 'adult' | 'child' | 'teen' | 'all';

export interface SportCategoryDefinition {
  id: string;
  name: string;
  description?: string;
  ageGroups?: AgeGroup[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MembershipSubscription {
  id: string;
  memberId: string;
  membershipPlanId: string;
  status: 'active' | 'suspended' | 'cancelled' | 'expired';
  startDate: Timestamp;
  endDate: Timestamp;
  autoRenew: boolean;
  paymentMethodId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PackageUsageStats {
  totalSubscribers: number;
  activeSubscribers: number;
  averageDurationDays: number;
  // Add other relevant stats based on how this data is collected/used
}

const MEMBERSHIP_PACKAGES_COLLECTION = 'membershipPackages';
const SPORT_CATEGORIES_COLLECTION = 'sportCategories';

// Helper function to convert Firestore document to MembershipPlan
const convertDocToMembershipPlan = (doc: any): MembershipPlan => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    price: data.price,
    durationMonths: data.durationMonths,
    classCredits: data.classCredits,
    sportCategoryIds: data.sportCategoryIds || [],
    ageGroup: data.ageGroup,
    status: data.status,
    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    createdBy: data.createdBy || null,
    updatedBy: data.updatedBy || null,
  };
};

// Membership Package Service
export const membershipPackageService = {
  /**
   * Creates a new membership package.
   * @param packageData The data for the new membership package.
   * @param userId The ID of the user creating the package.
   * @param userName The name of the user creating the package.
   * @returns The ID of the newly created package.
   */
  async createMembershipPackage(
    packageData: MembershipPlanFormData,
    userId: string,
    userName: string
  ): Promise<string> {
    try {
      const newPackageRef = doc(collection(db, MEMBERSHIP_PACKAGES_COLLECTION));
      await setDoc(newPackageRef, {
        ...packageData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
      });
      return newPackageRef.id;
    } catch (error) {
      console.error('Error creating membership package:', error);
      throw new Error('Failed to create membership package.');
    }
  },

  /**
   * Fetches a single membership package by its ID.
   * @param id The ID of the membership package.
   * @returns The membership package record or null if not found.
   */
  async getMembershipPackageById(id: string): Promise<MembershipPlan | null> {
    try {
      const docRef = doc(db, MEMBERSHIP_PACKAGES_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return convertDocToMembershipPlan(docSnap);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching membership package with ID ${id}:`, error);
      throw new Error('Failed to fetch membership package.');
    }
  },

  /**
   * Updates an existing membership package.
   * @param id The ID of the package to update.
   * @param updates The partial data to update.
   * @param userId The ID of the user updating the package.
   */
  async updateMembershipPackage(
    id: string,
    updates: Partial<MembershipPlanFormData>,
    userId: string
  ): Promise<void> {
    try {
      const packageRef = doc(db, MEMBERSHIP_PACKAGES_COLLECTION, id);
      await updateDoc(packageRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error updating membership package with ID ${id}:`, error);
      throw new Error('Failed to update membership package.');
    }
  },

  /**
   * Deletes a membership package by its ID.
   * @param id The ID of the package to delete.
   */
  async deleteMembershipPackage(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, MEMBERSHIP_PACKAGES_COLLECTION, id));
    } catch (error) {
      console.error(`Error deleting membership package with ID ${id}:`, error);
      throw new Error('Failed to delete membership package.');
    }
  },

  /**
   * Retrieves all membership packages.
   * @returns A list of all membership packages.
   */
  async getAllMembershipPackages(): Promise<MembershipPlan[]> {
    try {
      const q = query(collection(db, MEMBERSHIP_PACKAGES_COLLECTION), orderBy('name'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertDocToMembershipPlan);
    } catch (error) {
      console.error('Error fetching all membership packages:', error);
      throw new Error('Failed to fetch all membership packages.');
    }
  },

  /**
   * Retrieves all active membership packages.
   * @returns A list of active membership packages.
   */
  async getActiveMembershipPackages(): Promise<MembershipPlan[]> {
    try {
      const q = query(
        collection(db, MEMBERSHIP_PACKAGES_COLLECTION),
        where('status', '==', 'active'),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertDocToMembershipPlan);
    } catch (error) {
      console.error('Error fetching active membership packages:', error);
      throw new Error('Failed to fetch active membership packages.');
    }
  },

  /**
   * Retrieves membership packages filtered by age group.
   * @param ageGroup The age group to filter by.
   * @returns A list of membership packages for the specified age group.
   */
  async getPackagesByAgeGroup(ageGroup: AgeGroup): Promise<MembershipPlan[]> {
    try {
      const q = query(
        collection(db, MEMBERSHIP_PACKAGES_COLLECTION),
        where('ageGroup', '==', ageGroup),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertDocToMembershipPlan);
    } catch (error) {
      console.error(`Error fetching packages for age group ${ageGroup}:`, error);
      throw new Error('Failed to fetch packages by age group.');
    }
  },

  /**
   * Clones an existing membership package.
   * @param packageId The ID of the package to clone.
   * @param newName The name for the cloned package.
   * @param userId The ID of the user performing the clone.
   * @param userName The name of the user performing the clone.
   * @returns The ID of the cloned package.
   */
  async cloneMembershipPackage(
    packageId: string,
    newName: string,
    userId: string,
    userName: string
  ): Promise<string> {
    try {
      const originalPackage = await membershipPackageService.getMembershipPackageById(packageId);
      if (!originalPackage) {
        throw new Error('Original package not found for cloning.');
      }

      const clonedData: MembershipPlanFormData = {
        name: newName,
        description: originalPackage.description,
        price: originalPackage.price,
        durationMonths: originalPackage.durationMonths,
        classCredits: originalPackage.classCredits,
        sportCategoryIds: originalPackage.sportCategoryIds,
        ageGroup: originalPackage.ageGroup,
        status: 'draft',
        durationValue: 0,
        durationType: 'days',
        currency: '',
        classTypes: []
      };

      return await membershipPackageService.createMembershipPackage(
        clonedData,
        userId,
        userName
      );
    } catch (error) {
      console.error(`Error cloning membership package ${packageId}:`, error);
      throw new Error('Failed to clone membership package.');
    }
  },

  /**
   * Validates membership package data.
   * @param data The data to validate.
   * @returns An array of error messages, or empty if valid.
   */
  validatePackageData(data: MembershipPlanFormData): string[] {
    const errors: string[] = [];
    if (!data.name || data.name.trim() === '') {
      errors.push('Package name is required.');
    }
    if (data.price === undefined || data.price < 0) {
      errors.push('Price must be a non-negative number.');
    }
    if (data.durationMonths === undefined || data.durationMonths <= 0) {
      errors.push('Duration must be a positive number of months.');
    }
    if (data.classCredits === undefined || data.classCredits < 0) {
      errors.push('Class credits must be a non-negative number.');
    }
    if (!data.ageGroup) {
      errors.push('Age group is required.');
    }
    return errors;
  },

  /**
   * Retrieves usage statistics for a specific membership package.
   * (This is a placeholder and would require actual subscription tracking logic)
   * @param packageId The ID of the package to get stats for.
   * @returns Package usage statistics.
   */
  async getPackageUsageStats(packageId: string): Promise<PackageUsageStats> {
    // This is a placeholder. Real implementation would involve querying
    // member subscriptions linked to this package.
    console.warn(`Fetching usage stats for package ${packageId} - this is a mock.`);
    return {
      totalSubscribers: Math.floor(Math.random() * 100),
      activeSubscribers: Math.floor(Math.random() * 50),
      averageDurationDays: Math.floor(Math.random() * 365),
    };
  },

  // Sport Category Management
  /**
   * Loads sport categories from a predefined source (e.g., JSON file or initial data).
   * This is a utility function, likely used for initial setup or migrations.
   */
  async loadSportCategories(): Promise<void> {
    // Example data - this would typically come from a static file or initial setup.
    const categories: Omit<SportCategoryDefinition, 'id'>[] = [
      { name: 'Brazilian Jiu-Jitsu', description: 'Grappling martial art.', ageGroups: ['adult', 'teen'] },
      { name: 'Muay Thai', description: 'Thai boxing.', ageGroups: ['adult', 'teen'] },
      { name: 'Kids Martial Arts', description: 'Martial arts for children.', ageGroups: ['child'] },
      { name: 'Wrestling', description: 'Grappling combat sport.', ageGroups: ['adult', 'teen'] },
      { name: 'Yoga', description: 'Flexibility and strength.', ageGroups: ['all'] },
    ];

    for (const categoryData of categories) {
      const categoryRef = doc(collection(db, SPORT_CATEGORIES_COLLECTION));
      await setDoc(categoryRef, {
        ...categoryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    console.log('Sport categories loaded successfully (if not already present).');
  },

  /**
   * Adds a new sport category.
   * @param categoryData The data for the new sport category.
   * @returns The ID of the newly created category.
   */
  async addSportCategory(
    categoryData: Omit<SportCategoryDefinition, 'id'>
  ): Promise<string> {
    try {
      const newCategoryRef = doc(collection(db, SPORT_CATEGORIES_COLLECTION));
      await setDoc(newCategoryRef, {
        ...categoryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newCategoryRef.id;
    } catch (error) {
      console.error('Error adding sport category:', error);
      throw new Error('Failed to add sport category.');
    }
  },

  /**
   * Retrieves all sport categories.
   * @returns A list of all sport categories.
   */
  async getAllSportCategories(): Promise<SportCategoryDefinition[]> {
    try {
      const q = query(collection(db, SPORT_CATEGORIES_COLLECTION), orderBy('name'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        ageGroups: doc.data().ageGroups || [],
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : undefined,
        updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : undefined,
      }));
    } catch (error) {
      console.error('Error fetching all sport categories:', error);
      throw new Error('Failed to fetch all sport categories.');
    }
  },

  /**
   * Retrieves sport categories filtered by age group.
   * @param ageGroup The age group to filter by.
   * @returns A list of sport categories for the specified age group.
   */
  async getSportCategoriesByAgeGroup(ageGroup: AgeGroup): Promise<SportCategoryDefinition[]> {
    try {
      const q = query(
        collection(db, SPORT_CATEGORIES_COLLECTION),
        where('ageGroups', 'array-contains', ageGroup),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        ageGroups: doc.data().ageGroups || [],
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : undefined,
        updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : undefined,
      }));
    } catch (error) {
      console.error(`Error fetching sport categories for age group ${ageGroup}:`, error);
      throw new Error('Failed to fetch sport categories by age group.');
    }
  },
};