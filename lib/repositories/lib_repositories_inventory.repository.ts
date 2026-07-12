// ============================================================================
// INVENTORY REPOSITORY - Data Access Layer for Inventory Management
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { 
  Inventory,
  InventoryWithProduct,
  InventoryMovement,
  PaginatedResponse,
  PaginationParams,
  InventoryMovementType
} from '../supabase/types';

/**
 * Inventory Repository
 * Handles inventory operations, movements, and transfers
 */
export class InventoryRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * Get inventory for a branch
   */
  async getByBranchAndProduct(
    companyId: string,
    branchId: string,
    productId: string
  ): Promise<Inventory | null> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select('*')
      .eq('company_id', companyId)
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Error fetching inventory: ${error.message}`);
    }

    return data as Inventory;
  }

  /**
   * Get all inventory for a branch
   */
  async getByBranch(
    companyId: string,
    branchId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<InventoryWithProduct>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    const { data, count, error } = await this.supabase
      .from('inventory')
      .select(`
        *,
        product:products(
          id,
          code,
          name,
          selling_price,
          cost_price,
          category_id,
          image_urls
        )
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .eq('branch_id', branchId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Error fetching branch inventory: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as unknown as InventoryWithProduct[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Create or initialize inventory for a product in a branch
   */
  async initializeInventory(
    companyId: string,
    branchId: string,
    productId: string,
    initialQuantity: number = 0
  ): Promise<Inventory> {
    // Check if already exists
    const existing = await this.getByBranchAndProduct(companyId, branchId, productId);
    if (existing) {
      return existing;
    }

    const { data, error } = await this.supabase
      .from('inventory')
      .insert([{
        company_id: companyId,
        branch_id: branchId,
        product_id: productId,
        quantity_on_hand: initialQuantity,
        minimum_stock: 0,
        ideal_stock: 0,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Error initializing inventory: ${error.message}`);
    }

    return data as Inventory;
  }

  /**
   * Get low stock products (below minimum)
   */
  async getLowStockProducts(
    companyId: string,
    branchId: string
  ): Promise<InventoryWithProduct[]> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select(`
        *,
        product:products(*)
      `)
      .eq('company_id', companyId)
      .eq('branch_id', branchId)
      .order('quantity_on_hand', { ascending: true });

    if (error) {
      throw new Error(`Error fetching low stock products: ${error.message}`);
    }

    return ((data || []) as any[]).filter(
      (inv) => inv.quantity_on_hand <= inv.minimum_stock
    ) as InventoryWithProduct[];
  }

  /**
   * Get products with zero stock
   */
  async getZeroStockProducts(
    companyId: string,
    branchId: string
  ): Promise<InventoryWithProduct[]> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select(`
        *,
        product:products(*)
      `)
      .eq('company_id', companyId)
      .eq('branch_id', branchId)
      .eq('quantity_on_hand', 0)
      .order('last_movement_at', { ascending: true });

    if (error) {
      throw new Error(`Error fetching zero stock products: ${error.message}`);
    }

    return data as InventoryWithProduct[];
  }

  /**
   * Get inventory movements paginated
   */
  async getMovements(
    companyId: string,
    params?: PaginationParams & {
      branchId?: string;
      productId?: string;
      movementType?: InventoryMovementType;
    }
  ): Promise<PaginatedResponse<InventoryMovement>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    let query = this.supabase
      .from('inventory_movements')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (params?.branchId) {
      query = query.eq('branch_id', params.branchId);
    }

    if (params?.productId) {
      query = query.eq('product_id', params.productId);
    }

    if (params?.movementType) {
      query = query.eq('movement_type', params.movementType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error fetching inventory movements: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as InventoryMovement[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Register an inventory movement using RPC
   */
  async registerMovement(
    companyId: string,
    branchId: string,
    productId: string,
    movementType: InventoryMovementType,
    quantity: number,
    notes?: string
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc(
      'register_inventory_movement',
      {
        p_company_id: companyId,
        p_branch_id: branchId,
        p_product_id: productId,
        p_movement_type: movementType,
        p_quantity: quantity,
        p_notes: notes || null,
      }
    );

    if (error) {
      throw new Error(`Error registering movement: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Transfer stock between branches using RPC
   */
  async transferStock(
    companyId: string,
    fromBranchId: string,
    toBranchId: string,
    productId: string,
    quantity: number,
    notes?: string
  ): Promise<boolean> {
    const { error } = await this.supabase.rpc('transfer_stock', {
      p_company_id: companyId,
      p_from_branch_id: fromBranchId,
      p_to_branch_id: toBranchId,
      p_product_id: productId,
      p_quantity: quantity,
      p_notes: notes || null,
    });

    if (error) {
      throw new Error(`Error transferring stock: ${error.message}`);
    }

    return true;
  }

  /**
   * Adjust stock manually
   */
  async adjustStock(
    companyId: string,
    branchId: string,
    productId: string,
    newQuantity: number,
    reason?: string
  ): Promise<boolean> {
    // Get current quantity
    const current = await this.getByBranchAndProduct(companyId, branchId, productId);
    if (!current) {
      throw new Error('Inventory not found');
    }

    const difference = newQuantity - current.quantity_on_hand;
    const movementType = difference > 0 ? InventoryMovementType.Entry : InventoryMovementType.Exit;

    // Register adjustment movement
    await this.registerMovement(
      companyId,
      branchId,
      productId,
      InventoryMovementType.Adjustment,
      Math.abs(difference),
      reason || 'Manual adjustment'
    );

    return true;
  }

  /**
   * Get inventory value report
   */
  async getInventoryValue(
    companyId: string,
    branchId?: string
  ): Promise<{
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
  }> {
    let query = this.supabase
      .from('inventory')
      .select(`
        quantity_on_hand,
        product:products(cost_price)
      `)
      .eq('company_id', companyId);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error calculating inventory value: ${error.message}`);
    }

    let totalValue = 0;
    let totalQuantity = 0;

    (data || []).forEach((inv: any) => {
      totalQuantity += inv.quantity_on_hand;
      totalValue += inv.quantity_on_hand * (inv.product?.cost_price || 0);
    });

    return {
      totalItems: data?.length || 0,
      totalQuantity,
      totalValue,
    };
  }

  /**
   * Get movement history for product
   */
  async getProductMovementHistory(
    companyId: string,
    productId: string,
    params?: PaginationParams & { branchId?: string }
  ): Promise<PaginatedResponse<InventoryMovement>> {
    const limit = params?.limit || 20;
    const offset = params?.offset || 0;

    let query = this.supabase
      .from('inventory_movements')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (params?.branchId) {
      query = query.eq('branch_id', params.branchId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error fetching product movement history: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as InventoryMovement[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Update inventory stock levels
   */
  async updateStockLevels(
    companyId: string,
    branchId: string,
    productId: string,
    minimumStock: number,
    idealStock: number
  ): Promise<Inventory> {
    const { data, error } = await this.supabase
      .from('inventory')
      .update({
        minimum_stock: minimumStock,
        ideal_stock: idealStock,
      })
      .eq('company_id', companyId)
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating stock levels: ${error.message}`);
    }

    return data as Inventory;
  }

  /**
   * Get inventory summary by category
   */
  async getSummaryByCategory(
    companyId: string,
    branchId: string
  ): Promise<Array<{
    category_id: string;
    category_name: string;
    total_items: number;
    total_quantity: number;
    total_value: number;
  }>> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select(`
        product:products(
          id,
          cost_price,
          category:categories(id, name)
        ),
        quantity_on_hand
      `)
      .eq('company_id', companyId)
      .eq('branch_id', branchId);

    if (error) {
      throw new Error(`Error getting category summary: ${error.message}`);
    }

    const grouped = (data || []).reduce((acc: Record<string, {
      category_id: string;
      category_name: string;
      total_items: number;
      total_quantity: number;
      total_value: number;
    }>, inv: any) => {
      const categoryId = inv.product?.category?.id;
      const categoryName = inv.product?.category?.name || 'Unknown';

      if (!acc[categoryId]) {
        acc[categoryId] = {
          category_id: categoryId,
          category_name: categoryName,
          total_items: 0,
          total_quantity: 0,
          total_value: 0,
        };
      }

      acc[categoryId].total_items += 1;
      acc[categoryId].total_quantity += inv.quantity_on_hand;
      acc[categoryId].total_value += inv.quantity_on_hand * (inv.product?.cost_price || 0);

      return acc;
    }, {} as Record<string, {
      category_id: string;
      category_name: string;
      total_items: number;
      total_quantity: number;
      total_value: number;
    }>);

    return Object.values(grouped);
  }
}

// Export singleton instance
export const inventoryRepository = new InventoryRepository();
