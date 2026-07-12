// ============================================================================
// TYPES - TypeScript Types for Database Models
// ============================================================================

// Enums
export enum UserRole {
  Admin = 'admin',
  Seller = 'seller',
  Client = 'client'
}

export enum SaleStatus {
  Pending = 'pending',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

export enum InventoryMovementType {
  Entry = 'entry',
  Exit = 'exit',
  Adjustment = 'adjustment',
  Transfer = 'transfer',
  Waste = 'waste'
}

export enum PetStatus {
  Available = 'available',
  Reserved = 'reserved',
  Sold = 'sold'
}

export enum NotificationType {
  StockCritical = 'stock_critical',
  StockEmpty = 'stock_empty',
  HighDemand = 'high_demand',
  NoMovement = 'no_movement',
  StockRestored = 'stock_restored'
}

export enum NotificationStatus {
  Unread = 'unread',
  Read = 'read'
}

// Base Entity Type
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Company
export interface Company extends BaseEntity {
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  tax_id: string | null;
  primary_color: string;
  secondary_color: string;
  business_hours: Record<string, any>;
  social_media: Record<string, any>;
  policies: Record<string, any>;
  enable_pet_catalog: boolean;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
}

// Branch
export interface Branch extends BaseEntity {
  company_id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  address: string;
  city: string | null;
  state: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  opening_time: string | null;
  closing_time: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
}

// User
export interface User extends BaseEntity {
  company_id: string;
  branch_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_by: string | null;
  updated_by: string | null;
}

// Category
export interface Category extends BaseEntity {
  company_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
}

// Brand
export interface Brand extends BaseEntity {
  company_id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
}

// Supplier
export interface Supplier extends BaseEntity {
  company_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
}

// Product
export interface Product extends BaseEntity {
  company_id: string;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string;
  brand_id: string | null;
  supplier_id: string | null;
  cost_price: number;
  selling_price: number;
  utility_percentage: number;
  iva_percentage: number;
  is_active: boolean;
  image_urls: string[];
  created_by: string | null;
  updated_by: string | null;
}

// Product with Relations
export interface ProductWithRelations extends Product {
  category?: Category;
  brand?: Brand;
  supplier?: Supplier;
}

// Inventory
export interface Inventory extends BaseEntity {
  company_id: string;
  branch_id: string;
  product_id: string;
  quantity_on_hand: number;
  minimum_stock: number;
  ideal_stock: number;
  last_movement_at: string | null;
  last_count_at: string | null;
}

// Inventory with Product Details
export interface InventoryWithProduct extends Inventory {
  product?: Product;
  branch?: Branch;
}

// Inventory Movement
export interface InventoryMovement extends BaseEntity {
  company_id: string;
  branch_id: string;
  product_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
}

// Customer
export interface Customer extends BaseEntity {
  company_id: string;
  phone: string;
  full_name: string;
  email: string | null;
  address: string | null;
  city: string | null;
  total_purchases: number;
  total_spent: number;
  is_blocked: boolean;
  last_purchase_at: string | null;
}

// Sale
export interface Sale extends BaseEntity {
  company_id: string;
  branch_id: string;
  customer_id: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  seller_id: string | null;
  sale_date: string;
  total_items: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: SaleStatus;
  payment_status: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
}

// Sale Item
export interface SaleItem extends BaseEntity {
  company_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
}

// Sale with Items
export interface SaleWithItems extends Sale {
  items?: SaleItem[];
  seller?: User;
  customer?: Customer;
}

// Pet
export interface Pet extends BaseEntity {
  company_id: string;
  branch_id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age_months: number | null;
  description: string | null;
  price: number;
  is_available: boolean;
  status: PetStatus;
  image_urls: string[];
  documents: Record<string, any>;
  health_info: Record<string, any>;
  created_by: string | null;
  updated_by: string | null;
}

// Pet Dashboard View (Materialized View)
export interface PetDashboardView {
  id: string;
  company_id: string;
  branch_id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age_months: number | null;
  price: number;
  is_available: boolean;
  status: PetStatus;
  description: string | null;
  main_image: string | null;
  image_urls: string[];
  company_name: string | null;
  branch_name: string | null;
}

// Notification
export interface Notification extends BaseEntity {
  company_id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  status: NotificationStatus;
  read_at: string | null;
}

// Push Subscription
export interface PushSubscription extends BaseEntity {
  user_id: string;
  company_id: string;
  endpoint: string;
  auth_key: string;
  p256dh_key: string;
  user_agent: string | null;
}

// Audit Log
export interface AuditLog extends BaseEntity {
  company_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
}

// Login Attempt
export interface LoginAttempt extends BaseEntity {
  user_id: string | null;
  company_id: string | null;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Pagination
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// Create Sale Request
export interface CreateSaleRequest {
  customer_phone: string;
  customer_name: string;
  items: CreateSaleItemRequest[];
  notes?: string;
}

export interface CreateSaleItemRequest {
  product_id: string;
  quantity: number;
  unit_price: number;
}

// Create Sale Response
export interface CreateSaleResponse {
  sale_id: string;
  total_amount: number;
}

// Transfer Stock Request
export interface TransferStockRequest {
  from_branch_id: string;
  to_branch_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
}

// Register Inventory Movement Request
export interface RegisterInventoryMovementRequest {
  product_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  notes?: string;
}

// Stock Alert
export interface StockAlert {
  branch_id: string;
  product_id: string;
  daily_average: number;
  days_to_stockout: number;
  alert_type: NotificationType;
  product?: Product;
}

// Report Params
export interface ReportParams {
  format: 'pdf' | 'excel' | 'json';
  startDate?: string;
  endDate?: string;
  branch_id?: string;
  seller_id?: string;
}

// Sales Report
export interface SalesReport {
  title: string;
  period: string;
  totalSales: number;
  totalAmount: number;
  totalTax: number;
  averageSaleValue: number;
  topProducts: ProductSalesData[];
  topSellers: SellerSalesData[];
  dailyTrend: DailySalesData[];
}

export interface ProductSalesData {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  total_amount: number;
}

export interface SellerSalesData {
  seller_id: string;
  seller_name: string;
  sales_count: number;
  total_amount: number;
}

export interface DailySalesData {
  date: string;
  total_sales: number;
  total_amount: number;
}

// Inventory Report
export interface InventoryReport {
  title: string;
  period: string;
  totalProducts: number;
  totalValue: number;
  criticalStock: InventoryWithProduct[];
  highStock: InventoryWithProduct[];
  noMovement: InventoryWithProduct[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
