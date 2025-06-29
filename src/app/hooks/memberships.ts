// src/app/hooks/useMemberships.ts - Custom hook for membership management

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { 
  MembershipPlan, 
  CreateMembershipPlanRequest, 
  UpdateMembershipPlanRequest,
  MembershipPlanFilters,
  MembershipStats 
} from '@/app/types/membership';

interface UseMembershipsReturn {
  memberships: MembershipPlan[];
  loading: boolean;
  error: string | null;
  stats: MembershipStats | null;
  createMembership: (data: CreateMembershipPlanRequest) => Promise<{ success: boolean; error?: string; data?: MembershipPlan }>;
  updateMembership: (id: string, data: UpdateMembershipPlanRequest) => Promise<{ success: boolean; error?: string; data?: MembershipPlan }>;
  deleteMembership: (id: string) => Promise<{ success: boolean; error?: string }>;
  loadMemberships: (filters?: MembershipPlanFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useMemberships = (autoLoad: boolean = true): UseMembershipsReturn => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MembershipStats | null>(null);

  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [user]);

  const loadMemberships = useCallback(async (filters?: MembershipPlanFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = await getAuthHeaders();
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
      if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.duration) params.append('duration', filters.duration.toString());
      if (filters?.searchTerm) params.append('search', filters.searchTerm);

      const url = `/api/memberships${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (response.ok) {
        setMemberships(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load memberships');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const loadStats = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/memberships/stats', { headers });
      const result = await response.json();

      if (response.ok) {
        setStats(result.data);
      } else {
        // Stats are optional, don't set error
        console.warn('Failed to load membership stats:', result.error);
      }
    } catch (err) {
      console.warn('Failed to load membership stats:', err);
    }
  }, [getAuthHeaders]);

  const createMembership = useCallback(async (data: CreateMembershipPlanRequest) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh the list
        await loadMemberships();
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to create membership plan' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create membership plan' 
      };
    }
  }, [getAuthHeaders, loadMemberships]);

  const updateMembership = useCallback(async (id: string, data: UpdateMembershipPlanRequest) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/memberships/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Update the local state
        setMemberships(prev => prev.map(membership => 
          membership.id === id ? result.data : membership
        ));
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to update membership plan' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update membership plan' 
      };
    }
  }, [getAuthHeaders]);

  const deleteMembership = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/memberships/${id}`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();

      if (response.ok) {
        // Remove from local state
        setMemberships(prev => prev.filter(membership => membership.id !== id));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to delete membership plan' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete membership plan' 
      };
    }
  }, [getAuthHeaders]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadMemberships(),
      loadStats(),
    ]);
  }, [loadMemberships, loadStats]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && user) {
      refreshData();
    }
  }, [autoLoad, user, refreshData]);

  return {
    memberships,
    loading,
    error,
    stats,
    createMembership,
    updateMembership,
    deleteMembership,
    loadMemberships,
    loadStats,
    refreshData,
  };
};

// src/app/hooks/useMemberMemberships.ts - Hook for managing member's individual memberships

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { 
  MemberMembership, 
  CreateMemberMembershipRequest,
  MemberMembershipFilters 
} from '@/app/types/membership';

interface UseMemberMembershipsReturn {
  memberMemberships: MemberMembership[];
  loading: boolean;
  error: string | null;
  createMemberMembership: (data: CreateMemberMembershipRequest) => Promise<{ success: boolean; error?: string; data?: MemberMembership }>;
  updateMemberMembership: (id: string, data: Partial<MemberMembership>) => Promise<{ success: boolean; error?: string; data?: MemberMembership }>;
  cancelMembership: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  suspendMembership: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  reactivateMembership: (id: string) => Promise<{ success: boolean; error?: string }>;
  loadMemberMemberships: (filters?: MemberMembershipFilters) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useMemberMemberships = (autoLoad: boolean = true): UseMemberMembershipsReturn => {
  const { user } = useAuth();
  const [memberMemberships, setMemberMemberships] = useState<MemberMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [user]);

  const loadMemberMemberships = useCallback(async (filters?: MemberMembershipFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = await getAuthHeaders();
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.memberId) params.append('memberId', filters.memberId);
      if (filters?.membershipPlanId) params.append('membershipPlanId', filters.membershipPlanId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
      if (filters?.startDateTo) params.append('startDateTo', filters.startDateTo);
      if (filters?.endDateFrom) params.append('endDateFrom', filters.endDateFrom);
      if (filters?.endDateTo) params.append('endDateTo', filters.endDateTo);
      if (filters?.isChildMembership !== undefined) params.append('isChildMembership', filters.isChildMembership.toString());
      if (filters?.searchTerm) params.append('search', filters.searchTerm);

      const url = `/api/member-memberships${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, { headers });
      const result = await response.json();

      if (response.ok) {
        setMemberMemberships(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load member memberships');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member memberships');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const createMemberMembership = useCallback(async (data: CreateMemberMembershipRequest) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/member-memberships', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh the list
        await loadMemberMemberships();
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to create member membership' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create member membership' 
      };
    }
  }, [getAuthHeaders, loadMemberMemberships]);

  const updateMemberMembership = useCallback(async (id: string, data: Partial<MemberMembership>) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/member-memberships/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Update the local state
        setMemberMemberships(prev => prev.map(membership => 
          membership.id === id ? result.data : membership
        ));
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to update member membership' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update member membership' 
      };
    }
  }, [getAuthHeaders]);

  const cancelMembership = useCallback(async (id: string, reason: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/member-memberships/${id}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setMemberMemberships(prev => prev.map(membership => 
          membership.id === id ? { ...membership, status: 'cancelled', cancellationReason: reason } : membership
        ));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to cancel membership' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to cancel membership' 
      };
    }
  }, [getAuthHeaders]);

  const suspendMembership = useCallback(async (id: string, reason: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/member-memberships/${id}/suspend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setMemberMemberships(prev => prev.map(membership => 
          membership.id === id ? { 
            ...membership, 
            status: 'suspended', 
            suspensionReason: reason,
            suspensionDate: new Date().toISOString()
          } : membership
        ));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to suspend membership' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to suspend membership' 
      };
    }
  }, [getAuthHeaders]);

  const reactivateMembership = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/member-memberships/${id}/reactivate`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setMemberMemberships(prev => prev.map(membership => 
          membership.id === id ? { 
            ...membership, 
            status: 'active',
            suspensionReason: undefined,
            suspensionDate: undefined,
            suspendedBy: undefined
          } : membership
        ));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to reactivate membership' };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to reactivate membership' 
      };
    }
  }, [getAuthHeaders]);

  const refreshData = useCallback(async () => {
    await loadMemberMemberships();
  }, [loadMemberMemberships]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && user) {
      refreshData();
    }
  }, [autoLoad, user, refreshData]);

  return {
    memberMemberships,
    loading,
    error,
    createMemberMembership,
    updateMemberMembership,
    cancelMembership,
    suspendMembership,
    reactivateMembership,
    loadMemberMemberships,
    refreshData,
  };
};