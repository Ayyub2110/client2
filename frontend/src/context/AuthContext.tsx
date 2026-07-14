import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiClient, ApiError } from '../lib/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'staff';
  staff_id: string | null;
  shop_id: string | null;
  is_active: boolean;
  community_username?: string | null;
  created_at: string;
  home_address?: string | null;
  blood_group?: string | null;
  dob?: string | null;
  personal_phone?: string | null;
  aadhar_number?: string | null;
  photo_url?: string | null;
}

interface ShopProfile {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  owner_id: string;
  shop_type?: string | null;
  gst_number?: string | null;
  currency_symbol?: string | null;
  currency_code?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  role: 'owner' | 'staff' | null;
  shop: ShopProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<'owner' | 'staff' | null>(null);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and load user profile if tokens exist
  const loadProfile = async (token: string) => {
    try {
      localStorage.setItem('gk_access_token', token);
      const { profile } = await apiClient.get<{ profile: UserProfile & { shop: ShopProfile } }>('/auth/me');
      
      const loadedUser: UserProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        staff_id: profile.staff_id,
        shop_id: profile.shop_id,
        is_active: profile.is_active,
        created_at: profile.created_at,
        home_address: profile.home_address,
        blood_group: profile.blood_group,
        dob: profile.dob,
        personal_phone: profile.personal_phone,
        aadhar_number: profile.aadhar_number,
        photo_url: profile.photo_url
      };

      setUser(loadedUser);
      setRole(profile.role);
      setShop(profile.shop);

      // Save to cache for offline/transient error fallback
      localStorage.setItem('gk_cached_user', JSON.stringify(loadedUser));
      localStorage.setItem('gk_cached_shop', JSON.stringify(profile.shop));
      localStorage.setItem('gk_cached_role', profile.role);
    } catch (error) {
      console.error('Failed to load profile:', error);
      
      // Clear auth ONLY on genuine 401/403 credentials errors
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearAuth();
      } else {
        // Retrieve cached user session if available to prevent kicking out to login screen
        const cachedUser = localStorage.getItem('gk_cached_user');
        const cachedShop = localStorage.getItem('gk_cached_shop');
        const cachedRole = localStorage.getItem('gk_cached_role');
        
        if (cachedUser && cachedShop && cachedRole) {
          try {
            setUser(JSON.parse(cachedUser));
            setShop(JSON.parse(cachedShop));
            setRole(cachedRole as any);
          } catch {
            clearAuth();
          }
        } else {
          clearAuth();
        }
      }
    }
  };

  const reloadProfile = async () => {
    const token = localStorage.getItem('gk_access_token');
    if (token) {
      await loadProfile(token);
    }
  };

  const clearAuth = () => {
    setUser(null);
    setRole(null);
    setShop(null);
    localStorage.removeItem('gk_access_token');
    localStorage.removeItem('gk_refresh_token');
    localStorage.removeItem('gk_cached_user');
    localStorage.removeItem('gk_cached_shop');
    localStorage.removeItem('gk_cached_role');
  };

  // Sync Supabase Client State with Local Storage and vice versa
  useEffect(() => {
    // 1. Initial check of session
    const checkInitialSession = async () => {
      setIsLoading(true);
      const storedAccessToken = localStorage.getItem('gk_access_token');
      const storedRefreshToken = localStorage.getItem('gk_refresh_token');
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        localStorage.setItem('gk_refresh_token', session.refresh_token);
        await loadProfile(session.access_token);
      } else if (storedAccessToken) {
        try {
          await loadProfile(storedAccessToken);
        } catch (error) {
          console.warn('Stored access token did not restore the session:', error);
          clearAuth();
        }
      } else if (storedRefreshToken) {
        try {
          await supabase.auth.setSession({
            refresh_token: storedRefreshToken
          } as any);
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession?.access_token) {
            localStorage.setItem('gk_refresh_token', newSession.refresh_token);
            localStorage.setItem('gk_access_token', newSession.access_token);
            await loadProfile(newSession.access_token);
          } else {
            clearAuth();
          }
        } catch (error) {
          console.warn('Failed to restore session using stored refresh token:', error);
          clearAuth();
        }
      } else {
        clearAuth();
      }
      setIsLoading(false);
    };

    checkInitialSession();

    // 2. Set listener on Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('gk_refresh_token', session.refresh_token);
        await loadProfile(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        localStorage.setItem('gk_refresh_token', session.refresh_token);
        localStorage.setItem('gk_access_token', session.access_token);
      }
      setIsLoading(false);
    });

    // Refresh token every 30 minutes in background to keep user logged in indefinitely
    const refreshInterval = setInterval(() => {
      refreshSession();
    }, 30 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: UserProfile;
        shop: ShopProfile;
      }>('/auth/login', { email, password });

      // Save tokens locally
      localStorage.setItem('gk_access_token', data.accessToken);
      localStorage.setItem('gk_refresh_token', data.refreshToken);

      // Sync Supabase Auth client session with backend tokens
      await supabase.auth.setSession({
        access_token: data.accessToken,
        refresh_token: data.refreshToken
      });

      setUser(data.user);
      setRole(data.user.role);
      setShop(data.shop);
    } catch (err) {
      clearAuth();
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request to backend failed, logging out locally', err);
    } finally {
      await supabase.auth.signOut();
      clearAuth();
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    const refreshToken = localStorage.getItem('gk_refresh_token');
    if (!refreshToken) return;

    try {
      const data = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/refresh', { refreshToken });

      localStorage.setItem('gk_access_token', data.accessToken);
      localStorage.setItem('gk_refresh_token', data.refreshToken);

      await supabase.auth.setSession({
        access_token: data.accessToken,
        refresh_token: data.refreshToken
      });
    } catch (err) {
      console.error('Failed to refresh session', err);
      // ONLY log out if it is a genuine credentials error (400 Bad Request, 401 Unauthorized, 403 Forbidden)
      if (err instanceof ApiError && (err.status === 400 || err.status === 401 || err.status === 403)) {
        await logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        shop,
        isLoading,
        login,
        logout,
        refreshSession,
        reloadProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
