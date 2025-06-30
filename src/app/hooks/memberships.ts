// src/app/hooks/useMemberships.ts - Streamlined Membership Management Hook
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  MembershipPlan,
  MembershipPlanFormData,
  MembershipPlanFilters,
  MembershipStats
} from '@/app/types/membership';

interface UseMembershipsReturn {
  memberships: MembershipPlan[];
  loading: boolean;
  error: string | null;
  stats: MembershipStats | null;
  createMembership: (data: MembershipPlanFormData) => Promise<{ success: boolean; error?: string; data?: MembershipPlan }>;
  updateMembership: (id: string, data: MembershipPlanFormData) => Promise<{ success: boolean; error?: string; data?: MembershipPlan }>;
  deleteMembership: (id: string) => Promise<{ success: boolean; error?: string }>;
  loadMemberships: (filters?: MembershipPlanFilters) => Promise<void>;
  loadStats: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export const useMemberships = (autoLoad: boolean = true): UseMembershipsReturn => {
  const { sessionData } = useAuth();
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MembershipStats | null>(null);

  const handleApiError = useCallback((error: any, defaultMessage: string) => {
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  }, []);

  const loadMemberships = useCallback(async (filters?: MembershipPlanFilters) => {
    if (!sessionData) return;

    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.isActive !== undefined) params.append('status', filters.isActive ? 'active' : 'inactive');
      if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.duration) params.append('duration', filters.duration.toString());
      if (filters?.searchTerm) params.append('search', filters.searchTerm);

      const url = `/api/memberships${params.toString() ? `?${params.toString()}` : ''}`;

      // Rely on session cookie for authentication
      const response = await fetch(url, { credentials: 'include' });
      const result = await response.json();

      if (response.ok && result.success) {
        setMemberships(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load memberships');
      }
    } catch (err) {
      setError(handleApiError(err, 'Failed to load memberships'));
    } finally {
      setLoading(false);
    }
  }, [sessionData, handleApiError]);

  const loadStats = useCallback(async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('/api/memberships/stats', { credentials: 'include' });
      const result = await response.json();

      if (response.ok && result.success) {
        setStats(result.data);
      } else {
        // Stats are optional, don't throw error
        setStats(null);
      }
    } catch (err) {
      // Stats are optional, don't throw error
      setStats(null);
    }
  }, [sessionData]);

  const createMembership = useCallback(async (data: MembershipPlanFormData) => {
    if (!sessionData) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Add to local state
        setMemberships(prev => [result.data, ...prev]);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to create membership plan' };
      }
    } catch (err) {
      return {
        success: false,
        error: handleApiError(err, 'Failed to create membership plan')
      };
    }
  }, [sessionData, handleApiError]);

  const updateMembership = useCallback(async (id: string, data: MembershipPlanFormData) => {
    if (!sessionData) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/memberships/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local state
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
        error: handleApiError(err, 'Failed to update membership plan')
      };
    }
  }, [sessionData, handleApiError]);

  const deleteMembership = useCallback(async (id: string) => {
    if (!sessionData) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/memberships/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Remove from local state
        setMemberships(prev => prev.filter(membership => membership.id !== id));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to delete membership plan' };
      }
    } catch (err) {
      return {
        success: false,
        error: handleApiError(err, 'Failed to delete membership plan')
      };
    }
  }, [sessionData, handleApiError]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadMemberships(),
      loadStats(),
    ]);
  }, [loadMemberships, loadStats]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load on mount if user is authenticated and is admin
  useEffect(() => {
    if (autoLoad && sessionData?.role === 'admin') {
      refreshData();
    }
  }, [autoLoad, sessionData?.role, refreshData]);

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
    clearError,
  };
};

// Additional hook for membership statistics
export const useMembershipStats = () => {
  const { sessionData } = useAuth();
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!sessionData) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/memberships/stats', { credentials: 'include' });
      const result = await response.json();

      if (response.ok && result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to load stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [sessionData]);

  useEffect(() => {
    if (sessionData) {
      loadStats();
    }
  }, [sessionData, loadStats]);

  return {
    stats,
    loading,
    error,
    reload: loadStats,
  };
};