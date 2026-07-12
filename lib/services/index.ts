// ============================================================================
// BUSINESS LOGIC SERVICES
// Handles validation, coordination, and business logic
// ============================================================================

import {
  validateData,
  CreateSaleSchema,
  RegisterInventoryMovementSchema,
  TransferStockSchema,
  CreateProductSchema,
  CreateSale,
} from '../validations/schemas';
import { productRepository } from '../repositories/lib_repositories_product.repository';
import { salesRepository } from '../repositories/lib_repositories_sale.repository';
import { inventoryRepository } from '../repositories/lib_repositories_inventory.repository';
import {
  userRepository,
  notificationRepository,
  customerRepository,
} from '../repositories/index';
import {
  NotificationType,
  NotificationStatus,
  CreateSaleItemRequest,
} from '../supabase/types';

/**
 * PRODUCT SERVICE
 */
export class ProductService {
  async createProduct(companyId: string, input: any) {
    const validated = validateData(CreateProductSchema, input);

    // Check code uniqueness
    const existing = await productRepository.search(companyId, validated.code);
    if (existing.data.length > 0) {
      throw new Error('Product code already exists');
    }

    return await productRepository.create(companyId, {
      ...validated,
      company_id: companyId,
    } as any);
  }

  async updateProduct(companyId: string, productId: string, input: any) {
    const product = await productRepository.findById(companyId, productId);
    if (!product) {
      throw new Error('Product not found');
    }

    return await productRepository.update(companyId, productId, input);
  }

  async getProductsWithInventory(
    companyId: string,
    branchId: string,
    pagination: any
  ) {
    const products = await productRepository.findAllPaginated(companyId, pagination);

    // Enrich with inventory data
    const enriched = await Promise.all(
      products.data.map(async (product) => {
        const inv = await inventoryRepository.getByBranchAndProduct(
          companyId,
          branchId,
          product.id
        );
        return {
          ...product,
          quantity_on_hand: inv?.quantity_on_hand || 0,
          minimum_stock: inv?.minimum_stock || 0,
        };
      })
    );

    return {
      ...products,
      data: enriched,
    };
  }
}

/**
 * SALES SERVICE
 */
export class SalesService {
  async createSale(
    companyId: string,
    branchId: string,
    sellerId: string | null,
    input: CreateSale
  ) {
    // Validate input
    const validated = validateData(CreateSaleSchema, input);

    // Verify all products exist and have sufficient stock
    for (const item of validated.items) {
      const product = await productRepository.findById(companyId, item.product_id);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const inventory = await inventoryRepository.getByBranchAndProduct(
        companyId,
        branchId,
        item.product_id
      );

      if (!inventory || inventory.quantity_on_hand < item.quantity) {
        throw new Error(
          `Insufficient stock for product ${product.name}. Available: ${inventory?.quantity_on_hand || 0}`
        );
      }
    }

    // Get or create customer
    const customer = await customerRepository.getOrCreate(
      companyId,
      validated.customer_phone,
      validated.customer_name
    );

    // Create sale with transaction
    const result = await salesRepository.createSaleWithItems(
      companyId,
      branchId,
      validated,
      customer.id,
      sellerId
    );

    // Update customer purchase stats
    await customerRepository.updatePurchaseInfo(customer.id, result.totalAmount);

    // Create notification for admin
    const adminUsers = await userRepository.findByCompany(companyId);
    for (const admin of adminUsers.data) {
      if (admin.role === 'admin') {
        await notificationRepository.create({
          company_id: companyId,
          user_id: admin.id,
          notification_type: NotificationType.HighDemand,
          title: 'New Sale',
          message: `New sale of $${result.totalAmount.toFixed(2)} by ${validated.customer_name}`,
          related_entity_type: 'sale',
          related_entity_id: result.saleId,
          status: NotificationStatus.Unread,
        } as any);
      }
    }

    return result;
  }

  async cancelSale(companyId: string, saleId: string) {
    const sale = await salesRepository.findById(companyId, saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    await salesRepository.cancelSale(companyId, saleId);

    // Create notification
    const adminUsers = await userRepository.findByCompany(companyId);
    for (const admin of adminUsers.data) {
      if (admin.role === 'admin') {
        await notificationRepository.create({
          company_id: companyId,
          user_id: admin.id,
          notification_type: NotificationType.StockRestored,
          title: 'Sale Cancelled',
          message: `Sale ${saleId.substring(0, 8)} has been cancelled`,
          related_entity_type: 'sale',
          related_entity_id: saleId,
          status: NotificationStatus.Unread,
        } as any);
      }
    }

    return true;
  }

  async getSalesSummary(
    companyId: string,
    params: { startDate?: string; endDate?: string; branchId?: string }
  ) {
    return await salesRepository.getSalesSummary(companyId, params);
  }

  async getTopProducts(
    companyId: string,
    params: { limit?: number; startDate?: string; endDate?: string; branchId?: string }
  ) {
    return await salesRepository.getTopProductsBySales(companyId, params);
  }

  async getDailySalesTrend(
    companyId: string,
    params: { days?: number; branchId?: string }
  ) {
    return await salesRepository.getDailySalesTrend(companyId, params);
  }
}

/**
 * INVENTORY SERVICE
 */
export class InventoryService {
  async registerMovement(
    companyId: string,
    branchId: string,
    input: any
  ) {
    const validated = validateData(RegisterInventoryMovementSchema, input);

    // Verify product exists
    const product = await productRepository.findById(companyId, validated.product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Register movement
    await inventoryRepository.registerMovement(
      companyId,
      branchId,
      validated.product_id,
      validated.movement_type,
      validated.quantity,
      validated.notes
    );

    // Check if stock is now critical and create alert
    const inventory = await inventoryRepository.getByBranchAndProduct(
      companyId,
      branchId,
      validated.product_id
    );

    if (inventory && inventory.quantity_on_hand <= inventory.minimum_stock) {
      const adminUsers = await userRepository.findByCompany(companyId);
      for (const admin of adminUsers.data) {
        if (admin.role === 'admin') {
          const alertType =
            inventory.quantity_on_hand === 0
              ? NotificationType.StockEmpty
              : NotificationType.StockCritical;

          await notificationRepository.create({
            company_id: companyId,
            user_id: admin.id,
            notification_type: alertType,
            title: `${alertType === NotificationType.StockEmpty ? 'Out of Stock' : 'Low Stock'}: ${product.name}`,
            message: `Only ${inventory.quantity_on_hand} units available. Minimum: ${inventory.minimum_stock}`,
            related_entity_type: 'product',
            related_entity_id: validated.product_id,
            status: NotificationStatus.Unread,
          } as any);
        }
      }
    }

    return { success: true };
  }

  async transferStock(
    companyId: string,
    input: any
  ) {
    const validated = validateData(TransferStockSchema, input);

    // Verify product exists
    const product = await productRepository.findById(companyId, validated.product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check available stock
    const fromInventory = await inventoryRepository.getByBranchAndProduct(
      companyId,
      validated.from_branch_id,
      validated.product_id
    );

    if (!fromInventory || fromInventory.quantity_on_hand < validated.quantity) {
      throw new Error(
        `Insufficient stock. Available: ${fromInventory?.quantity_on_hand || 0}`
      );
    }

    // Ensure destination has inventory record
    await inventoryRepository.initializeInventory(
      companyId,
      validated.to_branch_id,
      validated.product_id
    );

    // Execute transfer
    await inventoryRepository.transferStock(
      companyId,
      validated.from_branch_id,
      validated.to_branch_id,
      validated.product_id,
      validated.quantity,
      validated.notes
    );

    return { success: true };
  }

  async adjustStock(
    companyId: string,
    branchId: string,
    productId: string,
    newQuantity: number,
    reason?: string
  ) {
    // Verify product exists
    const product = await productRepository.findById(companyId, productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Ensure inventory exists
    await inventoryRepository.initializeInventory(
      companyId,
      branchId,
      productId
    );

    await inventoryRepository.adjustStock(
      companyId,
      branchId,
      productId,
      newQuantity,
      reason
    );

    return { success: true };
  }

  async getLowStockAlerts(companyId: string, branchId: string) {
    return await inventoryRepository.getLowStockProducts(companyId, branchId);
  }

  async getInventoryValue(companyId: string, branchId?: string) {
    return await inventoryRepository.getInventoryValue(companyId, branchId);
  }

  async getSummaryByCategory(companyId: string, branchId: string) {
    return await inventoryRepository.getSummaryByCategory(companyId, branchId);
  }
}

/**
 * NOTIFICATION SERVICE
 */
export class NotificationService {
  async getUserNotifications(userId: string, pagination: any) {
    return await notificationRepository.findByUser(userId, pagination);
  }

  async getUnreadNotifications(userId: string) {
    return await notificationRepository.findUnread(userId);
  }

  async markAsRead(notificationId: string) {
    return await notificationRepository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string) {
    await notificationRepository.markAllAsRead(userId);
    return { success: true };
  }

  async createNotification(
    companyId: string,
    userId: string,
    notificationType: NotificationType,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ) {
    return await notificationRepository.create({
      company_id: companyId,
      user_id: userId,
      notification_type: notificationType,
      title,
      message,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      status: NotificationStatus.Unread,
    } as any);
  }

  /**
   * Generate alerts based on sales average and inventory levels
   * Should be run daily via scheduled job
   */
  async generateStockAlerts(companyId: string) {
    const users = await userRepository.findByCompany(companyId);
    const adminUsers = users.data.filter((u) => u.role === 'admin');

    // Get all branches for company
    const branches = await this.getBranchesByCompany(companyId);

    for (const branch of branches) {
      // Get low stock products
      const lowStockProducts = await inventoryRepository.getLowStockProducts(
        companyId,
        branch.id
      );

      for (const product of lowStockProducts) {
        for (const admin of adminUsers) {
          await this.createNotification(
            companyId,
            admin.id,
            NotificationType.StockCritical,
            `Low Stock: ${product.product?.name}`,
            `Only ${product.quantity_on_hand} units available`,
            'product',
            product.product_id
          );
        }
      }
    }
  }

  private async getBranchesByCompany(companyId: string): Promise<{ id: string }[]> {
    // This should call a branch repository method
    // For now, returning empty array
    return [];
  }
}

// Export service instances
export const productService = new ProductService();
export const salesService = new SalesService();
export const inventoryService = new InventoryService();
export const notificationService = new NotificationService();
