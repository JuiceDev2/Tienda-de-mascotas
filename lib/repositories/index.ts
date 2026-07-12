// ============================================================================
// ADDITIONAL REPOSITORIES
// User, Notification, Customer, Pet, Category, Brand Repositories
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import {
  User,
  Notification,
  Customer,
  Pet,
  Category,
  Brand,
  PaginatedResponse,
  PaginationParams,
  NotificationStatus,
} from '../supabase/types';

/**
 * USER REPOSITORY
 */
export class UserRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw new Error(`Error fetching user: ${error.message}`);
    return data as User;
  }

  async findByCompany(companyId: string, params?: PaginationParams): Promise<PaginatedResponse<User>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    const { data, count, error } = await this.supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Error fetching users: ${error.message}`);

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as User[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  async create(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) throw new Error(`Error creating user: ${error.message}`);
    return data as User;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error updating user: ${error.message}`);
    return data as User;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Error deleting user: ${error.message}`);
    return true;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', id);
  }

  async recordLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('id, company_id')
      .eq('email', email)
      .single();

    await this.supabase.from('login_attempts').insert([{
      user_id: user?.id,
      company_id: user?.company_id,
      email,
      success,
      ip_address: ipAddress,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }]);
  }
}

/**
 * NOTIFICATION REPOSITORY
 */
export class NotificationRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findByUser(userId: string, params?: PaginationParams): Promise<PaginatedResponse<Notification>> {
    const limit = params?.limit || 20;
    const offset = params?.offset || 0;

    const { data, count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Error fetching notifications: ${error.message}`);

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Notification[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  async findUnread(userId: string): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', NotificationStatus.Unread)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error fetching unread notifications: ${error.message}`);
    return data as Notification[];
  }

  async create(notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>): Promise<Notification> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    if (error) throw new Error(`Error creating notification: ${error.message}`);
    return data as Notification;
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ status: NotificationStatus.Read, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw new Error(`Error marking notification as read: ${error.message}`);
    return data as Notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({ status: NotificationStatus.Read, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', NotificationStatus.Unread);
  }

  async delete(notificationId: string): Promise<void> {
    await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  }
}

/**
 * CUSTOMER REPOSITORY
 */
export class CustomerRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findByPhoneAndCompany(companyId: string, phone: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .eq('phone', phone)
      .is('deleted_at', null)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw new Error(`Error fetching customer: ${error.message}`);
    return data as Customer;
  }

  async findById(companyId: string, customerId: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', customerId)
      .is('deleted_at', null)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw new Error(`Error fetching customer: ${error.message}`);
    return data as Customer;
  }

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();

    if (error) throw new Error(`Error creating customer: ${error.message}`);
    return data as Customer;
  }

  async getOrCreate(
    companyId: string,
    phone: string,
    fullName: string
  ): Promise<Customer> {
    let customer = await this.findByPhoneAndCompany(companyId, phone);

    if (!customer) {
      customer = await this.create({
        company_id: companyId,
        phone,
        full_name: fullName,
        email: null,
        address: null,
        city: null,
        total_purchases: 0,
        total_spent: 0,
        is_blocked: false,
        last_purchase_at: null,
      });
    }

    return customer;
  }

  async updatePurchaseInfo(customerId: string, amount: number): Promise<void> {
    const { data: current, error: fetchError } = await this.supabase
      .from('customers')
      .select('total_purchases, total_spent')
      .eq('id', customerId)
      .single();

    if (fetchError) throw new Error(`Error fetching customer totals: ${fetchError.message}`);

    await this.supabase
      .from('customers')
      .update({
        total_purchases: (current?.total_purchases || 0) + 1,
        total_spent: (current?.total_spent || 0) + amount,
        last_purchase_at: new Date().toISOString(),
      })
      .eq('id', customerId);
  }
}

/**
 * PET REPOSITORY
 */
export class PetRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findAllPaginated(
    companyId: string,
    params?: PaginationParams & { branchId?: string }
  ): Promise<PaginatedResponse<Pet>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    let query = this.supabase
      .from('pets')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (params?.branchId) {
      query = query.eq('branch_id', params.branchId);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Error fetching pets: ${error.message}`);

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Pet[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  async findById(companyId: string, petId: string): Promise<Pet | null> {
    const { data, error } = await this.supabase
      .from('pets')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', petId)
      .is('deleted_at', null)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw new Error(`Error fetching pet: ${error.message}`);
    return data as Pet;
  }

  async create(pet: Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Pet> {
    const { data, error } = await this.supabase
      .from('pets')
      .insert([pet])
      .select()
      .single();

    if (error) throw new Error(`Error creating pet: ${error.message}`);
    return data as Pet;
  }

  async update(companyId: string, petId: string, updates: Partial<Pet>): Promise<Pet> {
    const { data, error } = await this.supabase
      .from('pets')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', petId)
      .select()
      .single();

    if (error) throw new Error(`Error updating pet: ${error.message}`);
    return data as Pet;
  }

  async delete(companyId: string, petId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('pets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', petId);

    if (error) throw new Error(`Error deleting pet: ${error.message}`);
    return true;
  }

  async getDashboardView(companyId: string, branchId?: string): Promise<Pet[]> {
    let query = this.supabase
      .from('pet_dashboard_view')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_available', true);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Error fetching pet dashboard: ${error.message}`);
    return data as Pet[];
  }
}

/**
 * CATEGORY REPOSITORY
 */
export class CategoryRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findAllByCompany(companyId: string): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw new Error(`Error fetching categories: ${error.message}`);
    return data as Category[];
  }

  async create(category: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw new Error(`Error creating category: ${error.message}`);
    return data as Category;
  }

  async update(companyId: string, categoryId: string, updates: Partial<Category>): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw new Error(`Error updating category: ${error.message}`);
    return data as Category;
  }
}

/**
 * BRAND REPOSITORY
 */
export class BrandRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  async findAllByCompany(companyId: string): Promise<Brand[]> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Error fetching brands: ${error.message}`);
    return data as Brand[];
  }

  async create(brand: Omit<Brand, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Brand> {
    const { data, error } = await this.supabase
      .from('brands')
      .insert([brand])
      .select()
      .single();

    if (error) throw new Error(`Error creating brand: ${error.message}`);
    return data as Brand;
  }
}

// Export instances
export const userRepository = new UserRepository();
export const notificationRepository = new NotificationRepository();
export const customerRepository = new CustomerRepository();
export const petRepository = new PetRepository();
export const categoryRepository = new CategoryRepository();
export const brandRepository = new BrandRepository();
