// ============================================================================
// PRODUCT REPOSITORY - Data Access Layer for Products
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { 
  Product, 
  ProductWithRelations, 
  PaginatedResponse,
  PaginationParams 
} from '../supabase/types';

/**
 * Product Repository
 * Handles all database operations for products with optimized queries
 */
export class ProductRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * Find all products paginated with light projection for listings
   * Optimized for performance with selective columns
   */
  async findAllPaginated(
    companyId: string,
    params: PaginationParams & { 
      search?: string; 
      categoryId?: string; 
      brandId?: string;
      isActive?: boolean;
    }
  ): Promise<PaginatedResponse<Product>> {
    const { limit, offset, search, categoryId, brandId, isActive } = params;

    const PRODUCT_LIST_FIELDS = `
      id, 
      code, 
      name, 
      selling_price,
      cost_price,
      is_active,
      image_urls,
      category_id,
      brand_id,
      created_at,
      category:categories(name),
      brand:brands(name)
    `;

    let query = this.supabase
      .from('products')
      .select(PRODUCT_LIST_FIELDS, { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }

    const total = count || 0;
    const pageSize = limit;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / pageSize);

    return {
      data: data as Product[],
      count: data?.length || 0,
      total,
      page,
      pageSize,
      pageCount,
    };
  }

  /**
   * Find product by ID with all details and relations
   */
  async findById(companyId: string, productId: string): Promise<ProductWithRelations | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        brand:brands(*),
        supplier:suppliers(*)
      `)
      .eq('company_id', companyId)
      .eq('id', productId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Error fetching product: ${error.message}`);
    }

    return data as ProductWithRelations;
  }

  /**
   * Find product by code (barcode search)
   */
  async findByBarcode(companyId: string, barcode: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('barcode', barcode)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Error finding product by barcode: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Create a new product
   */
  async create(companyId: string, product: Omit<Product, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .insert([{ ...product, company_id: companyId }])
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Update product
   */
  async update(
    companyId: string,
    productId: string,
    updates: Partial<Product>
  ): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', productId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Soft delete product
   */
  async delete(companyId: string, productId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', productId);

    if (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }

    return true;
  }

  /**
   * Find products by category
   */
  async findByCategory(
    companyId: string,
    categoryId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Product>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    const { data, count, error } = await this.supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching products by category: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Product[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Find low stock products
   */
  async findLowStockProducts(
    companyId: string,
    branchId: string
  ): Promise<(Product & { quantity_on_hand: number; minimum_stock: number })[]> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select(`
        quantity_on_hand,
        minimum_stock,
        product:products(*)
      `)
      .eq('company_id', companyId)
      .eq('branch_id', branchId)
      .order('quantity_on_hand', { ascending: true });

    if (error) {
      throw new Error(`Error fetching low stock products: ${error.message}`);
    }

    return (data || [])
      .filter((inv: any) => inv.quantity_on_hand <= inv.minimum_stock)
      .map((inv: any) => ({
        ...inv.product,
        quantity_on_hand: inv.quantity_on_hand,
        minimum_stock: inv.minimum_stock,
      }));
  }

  /**
   * Bulk update products
   */
  async bulkUpdate(
    companyId: string,
    updates: Array<{ id: string; data: Partial<Product> }>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('products')
      .upsert(
        updates.map((u) => ({
          ...u.data,
          id: u.id,
          company_id: companyId,
        }))
      );

    if (error) {
      throw new Error(`Error bulk updating products: ${error.message}`);
    }

    return true;
  }

  /**
   * Search products with trigram (full text search)
   */
  async search(
    companyId: string,
    searchTerm: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Product>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    const { data, count, error } = await this.supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error searching products: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Product[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Get products for public client display
   * Only active, in stock products
   */
  async getPublicProducts(
    companyId: string,
    branchId?: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Product>> {
    const limit = params?.limit || 20;
    const offset = params?.offset || 0;

    let query = this.supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        selling_price,
        image_urls,
        category:categories(name),
        brand:brands(name),
        inventory!inner(quantity_on_hand)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (branchId) {
      query = query.eq('inventory.branch_id', branchId);
    }

    query = query.gt('inventory.quantity_on_hand', 0)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error fetching public products: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Product[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }
}

// Export singleton instance
export const productRepository = new ProductRepository();
