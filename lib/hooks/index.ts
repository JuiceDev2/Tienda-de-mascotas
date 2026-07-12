// ============================================================================
// CUSTOM HOOKS
// useAuth, useProducts, useSales, usePushNotifications
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Product, Sale } from '@/lib/supabase/types';

const supabase = createClient();

// ============================================================================
// useAuth - Authentication Hook
// ============================================================================

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, error } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        return null;
      }

      // Fetch user details from database
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      return data as User;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/');
    },
  });

  const login = useCallback(
    (email: string, password: string) => {
      return loginMutation.mutateAsync({ email, password });
    },
    [loginMutation]
  );

  const logout = useCallback(() => {
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return {
    user: user || null,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
  };
}

// ============================================================================
// useProducts - Products Fetching Hook
// ============================================================================

export function useProducts(options?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  branchId?: string;
}) {
  const { page = 1, limit = 10, search, categoryId, branchId } = options || {};

  const query = useQuery({
    queryKey: ['products', { page, limit, search, categoryId, branchId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search) params.append('search', search);
      if (categoryId) params.append('categoryId', categoryId);
      if (branchId) params.append('branchId', branchId);

      const response = await fetch(`/api/products?${params}`, {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch products');
      const { data } = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!branchId,
  });

  return {
    products: query.data?.data || [],
    total: query.data?.total || 0,
    pageCount: query.data?.pageCount || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// useSales - Sales Operations Hook
// ============================================================================

export function useSales(options?: {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
}) {
  const { page = 1, limit = 10, branchId, status } = options || {};
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sales', { page, limit, branchId, status }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (branchId) params.append('branchId', branchId);
      if (status) params.append('status', status);

      const response = await fetch(`/api/sales?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sales');
      const { data } = await response.json();
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
      if (!response.ok) throw new Error('Failed to create sale');
      const { data } = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const cancelSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      const response = await fetch(`/api/sales/${saleId}/cancel`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to cancel sale');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  return {
    sales: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error,
    createSale: createSaleMutation.mutateAsync,
    createSaleLoading: createSaleMutation.isPending,
    cancelSale: cancelSaleMutation.mutateAsync,
    cancelSaleLoading: cancelSaleMutation.isPending,
  };
}

// ============================================================================
// usePushNotifications - Push Notifications Hook
// ============================================================================

export function usePushNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered');

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      })
      .catch((error) => console.log('Service Worker registration failed:', error));
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.getKey('auth'),
            p256dh: subscription.getKey('p256dh'),
          },
        }),
      });

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }, []);

  const unsubscribeFromPush = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    }
  }, []);

  return {
    subscribeToPush,
    unsubscribeFromPush,
  };
}

// ============================================================================
// useNotifications - User Notifications Hook
// ============================================================================

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const { data } = await response.json();
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error,
    markAsRead: markAsReadMutation.mutateAsync,
    markAsReadLoading: markAsReadMutation.isPending,
    refetch: query.refetch,
  };
}

// ============================================================================
// useCart - Shopping Cart Hook (Local Storage)
// ============================================================================

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load cart from storage:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isLoading]);

  const addItem = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
        }
        return [...prev, item];
      });
    },
    []
  );

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isLoading,
  };
}

// ============================================================================
// useDebounce - Debounce Hook
// ============================================================================

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// useFetch - Generic Fetch Hook
// ============================================================================

export function useFetch<T>(
  url: string,
  options?: RequestInit & { enabled?: boolean }
) {
  const { enabled = true, ...fetchOptions } = options || {};

  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
    enabled,
  });
}
