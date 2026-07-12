// ============================================================================
// SALES REPOSITORY - Data Access Layer for Sales
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { 
  Sale, 
  SaleWithItems,
  SaleStatus,
  PaginatedResponse,
  PaginationParams,
  CreateSale 
} from '../lib_supabase_types';

/**
 * Sales Repository
 * Handles all database operations for sales with transactions
 */
export class SalesRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * Find all sales paginated with filters
   */
  async findAllPaginated(
    companyId: string,
    params: PaginationParams & {
      branchId?: string;
      status?: SaleStatus;
      sellerId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<SaleWithItems>> {
    const { limit, offset, branchId, status, sellerId, startDate, endDate } = params;

    let query = this.supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*),
        seller:users(id, full_name, email),
        customer:customers(id, full_name, phone)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('sale_date', { ascending: false });

    // Apply filters
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    if (startDate) {
      query = query.gte('sale_date', startDate);
    }

    if (endDate) {
      query = query.lte('sale_date', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error fetching sales: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as SaleWithItems[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Find sale by ID with all items and relations
   */
  async findById(companyId: string, saleId: string): Promise<SaleWithItems | null> {
    const { data, error } = await this.supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(
          id,
          product_id,
          quantity,
          unit_price,
          line_total,
          product:products(*)
        ),
        seller:users(id, full_name, email),
        customer:customers(id, full_name, phone, email)
      `)
      .eq('company_id', companyId)
      .eq('id', saleId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Error fetching sale: ${error.message}`);
    }

    return data as SaleWithItems;
  }

  /**
   * Create sale using RPC function (transactional)
   */
  async createSaleWithItems(
    companyId: string,
    branchId: string,
    sale: CreateSale,
    customerId: string | null,
    sellerId: string | null
  ): Promise<{ saleId: string; totalAmount: number }> {
    // Prepare items for RPC
    const items = sale.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    // Call RPC function
    const { data, error } = await this.supabase.rpc('create_sale_with_items', {
      p_company_id: companyId,
      p_branch_id: branchId,
      p_customer_id: customerId,
      p_customer_phone: sale.customer_phone,
      p_customer_name: sale.customer_name,
      p_seller_id: sellerId,
      p_items: JSON.stringify(items),
      p_notes: sale.notes || null,
    });

    if (error) {
      throw new Error(`Error creating sale: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create sale: No data returned from RPC');
    }

    // Fetch the created sale to get total_amount
    const sale_id = data;
    const createdSale = await this.findById(companyId, sale_id);

    if (!createdSale) {
      throw new Error('Failed to retrieve created sale');
    }

    return {
      saleId: sale_id,
      totalAmount: createdSale.total_amount,
    };
  }

  /**
   * Cancel sale using RPC function (reverts inventory)
   */
  async cancelSale(companyId: string, saleId: string): Promise<boolean> {
    // First verify the sale exists and belongs to company
    const sale = await this.findById(companyId, saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    if (sale.status === SaleStatus.Cancelled) {
      throw new Error('Sale is already cancelled');
    }

    // Call RPC function
    const { error } = await this.supabase.rpc('cancel_sale', {
      p_sale_id: saleId,
    });

    if (error) {
      throw new Error(`Error cancelling sale: ${error.message}`);
    }

    return true;
  }

  /**
   * Get sales by status
   */
  async findByStatus(
    companyId: string,
    status: SaleStatus,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Sale>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    const { data, count, error } = await this.supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('sale_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Error fetching sales by status: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Sale[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Get sales by date range
   */
  async findByDateRange(
    companyId: string,
    startDate: string,
    endDate: string,
    params?: PaginationParams & { branchId?: string }
  ): Promise<PaginatedResponse<Sale>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;
    const branchId = params?.branchId;

    let query = this.supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .is('deleted_at', null);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    query = query
      .order('sale_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error fetching sales by date range: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Sale[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Get sales summary for reporting
   */
  async getSalesSummary(
    companyId: string,
    params: {
      startDate?: string;
      endDate?: string;
      branchId?: string;
    }
  ): Promise<{
    totalSales: number;
    totalAmount: number;
    totalTax: number;
    averageSaleValue: number;
    completedSales: number;
  }> {
    let query = this.supabase
      .from('sales')
      .select('total_amount, tax_amount, status')
      .eq('company_id', companyId)
      .eq('status', SaleStatus.Completed)
      .is('deleted_at', null);

    if (params.startDate) {
      query = query.gte('sale_date', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('sale_date', params.endDate);
    }

    if (params.branchId) {
      query = query.eq('branch_id', params.branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error getting sales summary: ${error.message}`);
    }

    const sales = data || [];
    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalTax = sales.reduce((sum, s) => sum + (s.tax_amount || 0), 0);
    const averageSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;

    return {
      totalSales,
      totalAmount,
      totalTax,
      averageSaleValue,
      completedSales: totalSales,
    };
  }

  /**
   * Get top products by sales
   */
  async getTopProductsBySales(
    companyId: string,
    params: {
      limit?: number;
      startDate?: string;
      endDate?: string;
      branchId?: string;
    }
  ): Promise<Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    total_amount: number;
  }>> {
    let query = this.supabase
      .from('sale_items')
      .select(`
        product_id,
        quantity,
        line_total,
        product:products(name),
        sale:sales(sale_date, branch_id)
      `)
      .eq('company_id', companyId);

    if (params.startDate) {
      query = query.gte('sale.sale_date', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('sale.sale_date', params.endDate);
    }

    if (params.branchId) {
      query = query.eq('sale.branch_id', params.branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error getting top products: ${error.message}`);
    }

    // Group by product
    const grouped = (data || []).reduce((acc: any, item: any) => {
      const key = item.product_id;
      if (!acc[key]) {
        acc[key] = {
          product_id: item.product_id,
          product_name: item.product?.name || 'Unknown',
          quantity_sold: 0,
          total_amount: 0,
        };
      }
      acc[key].quantity_sold += item.quantity;
      acc[key].total_amount += item.line_total;
      return acc;
    }, {});

    // Sort by total amount and limit
    return Object.values(grouped)
      .sort((a: any, b: any) => b.total_amount - a.total_amount)
      .slice(0, params.limit || 10);
  }

  /**
   * Get sales by seller
   */
  async getSalesBySeller(
    companyId: string,
    sellerId: string,
    params?: PaginationParams & { startDate?: string; endDate?: string }
  ): Promise<PaginatedResponse<Sale>> {
    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    let query = this.supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('seller_id', sellerId)
      .is('deleted_at', null);

    if (params?.startDate) {
      query = query.gte('sale_date', params.startDate);
    }

    if (params?.endDate) {
      query = query.lte('sale_date', params.endDate);
    }

    query = query
      .order('sale_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Error fetching seller sales: ${error.message}`);
    }

    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);

    return {
      data: data as Sale[],
      count: data?.length || 0,
      total,
      page,
      pageSize: limit,
      pageCount,
    };
  }

  /**
   * Get daily sales trend
   */
  async getDailySalesTrend(
    companyId: string,
    params: {
      days?: number;
      branchId?: string;
    }
  ): Promise<Array<{
    date: string;
    total_sales: number;
    total_amount: number;
  }>> {
    const days = params.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = this.supabase
      .from('sales')
      .select('sale_date, total_amount')
      .eq('company_id', companyId)
      .eq('status', SaleStatus.Completed)
      .gte('sale_date', startDate.toISOString())
      .is('deleted_at', null);

    if (params.branchId) {
      query = query.eq('branch_id', params.branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error getting daily sales trend: ${error.message}`);
    }

    // Group by date
    const grouped = (data || []).reduce((acc: any, sale: any) => {
      const date = new Date(sale.sale_date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, total_sales: 0, total_amount: 0 };
      }
      acc[date].total_sales += 1;
      acc[date].total_amount += sale.total_amount;
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
}

// Export singleton instance
export const salesRepository = new SalesRepository();
