// ============================================================================
// VALIDATION SCHEMAS - Zod Schemas for all entities
// ============================================================================

import { z } from 'zod';
import { 
  UserRole, 
  SaleStatus, 
  InventoryMovementType, 
  PetStatus,
  NotificationType 
} from './lib_supabase_types';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const UUIDSchema = z.string().uuid('Invalid UUID format');
const DecimalSchema = z.number().min(0, 'Must be positive').or(
  z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid decimal format')
);

// ============================================================================
// COMPANY SCHEMAS
// ============================================================================

export const CompanyCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  website: z.string().url('Invalid URL').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  tax_id: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  enable_pet_catalog: z.boolean().default(true),
  business_hours: z.record(z.any()).optional(),
  social_media: z.record(z.any()).optional(),
  policies: z.record(z.any()).optional(),
});

export const CompanyUpdateSchema = CompanyCreateSchema.partial();

export type CompanyCreate = z.infer<typeof CompanyCreateSchema>;
export type CompanyUpdate = z.infer<typeof CompanyUpdateSchema>;

// ============================================================================
// BRANCH SCHEMAS
// ============================================================================

export const BranchCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  code: z.string().min(2).max(50, 'Code must be between 2 and 50 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().optional(),
  state: z.string().optional(),
  manager_name: z.string().optional(),
  manager_phone: z.string().optional(),
  opening_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format HH:mm').optional(),
  closing_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format HH:mm').optional(),
});

export const BranchUpdateSchema = BranchCreateSchema.partial();

export type BranchCreate = z.infer<typeof BranchCreateSchema>;
export type BranchUpdate = z.infer<typeof BranchUpdateSchema>;

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const UserCreateSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  branch_id: UUIDSchema.optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UserUpdateSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  branch_id: UUIDSchema.optional().nullable(),
  is_active: z.boolean().optional(),
});

export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const ProductCreateSchema = z.object({
  code: z.string().min(2).max(50, 'Code must be between 2 and 50 characters'),
  barcode: z.string().optional(),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  category_id: UUIDSchema,
  brand_id: UUIDSchema.optional(),
  supplier_id: UUIDSchema.optional(),
  cost_price: DecimalSchema,
  selling_price: DecimalSchema,
  utility_percentage: z.number().min(0).max(100).default(0),
  iva_percentage: z.number().min(0).max(100).default(0),
  image_urls: z.array(z.string().url()).default([]),
}).refine(
  (data) => parseFloat(String(data.selling_price)) > parseFloat(String(data.cost_price)),
  { message: 'Selling price must be greater than cost price', path: ['selling_price'] }
);

export const ProductUpdateSchema = ProductCreateSchema.partial();

export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

export const CategoryCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  image_url: z.string().url('Invalid URL').optional(),
  display_order: z.number().int().default(0),
});

export const CategoryUpdateSchema = CategoryCreateSchema.partial();

export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;

// ============================================================================
// BRAND SCHEMAS
// ============================================================================

export const BrandCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  logo_url: z.string().url('Invalid URL').optional(),
  description: z.string().optional(),
  website: z.string().url('Invalid URL').optional(),
});

export const BrandUpdateSchema = BrandCreateSchema.partial();

export type BrandCreate = z.infer<typeof BrandCreateSchema>;
export type BrandUpdate = z.infer<typeof BrandUpdateSchema>;

// ============================================================================
// SUPPLIER SCHEMAS
// ============================================================================

export const SupplierCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  website: z.string().url('Invalid URL').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
});

export const SupplierUpdateSchema = SupplierCreateSchema.partial();

export type SupplierCreate = z.infer<typeof SupplierCreateSchema>;
export type SupplierUpdate = z.infer<typeof SupplierUpdateSchema>;

// ============================================================================
// SALE SCHEMAS
// ============================================================================

export const SaleItemSchema = z.object({
  product_id: UUIDSchema,
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: DecimalSchema,
});

export const CreateSaleSchema = z.object({
  customer_phone: z.string().min(10, 'Invalid phone number'),
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters'),
  items: z.array(SaleItemSchema).min(1, 'Sale must have at least one item'),
  notes: z.string().optional(),
});

export const CancelSaleSchema = z.object({
  sale_id: UUIDSchema,
});

export type CreateSale = z.infer<typeof CreateSaleSchema>;
export type SaleItem = z.infer<typeof SaleItemSchema>;
export type CancelSale = z.infer<typeof CancelSaleSchema>;

// ============================================================================
// INVENTORY SCHEMAS
// ============================================================================

export const RegisterInventoryMovementSchema = z.object({
  product_id: UUIDSchema,
  movement_type: z.nativeEnum(InventoryMovementType),
  quantity: z.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
});

export const TransferStockSchema = z.object({
  from_branch_id: UUIDSchema,
  to_branch_id: UUIDSchema,
  product_id: UUIDSchema,
  quantity: z.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
}).refine(
  (data) => data.from_branch_id !== data.to_branch_id,
  { message: 'Origin and destination branches must be different', path: ['to_branch_id'] }
);

export const AdjustStockSchema = z.object({
  product_id: UUIDSchema,
  new_quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  reason: z.string().optional(),
});

export type RegisterInventoryMovement = z.infer<typeof RegisterInventoryMovementSchema>;
export type TransferStock = z.infer<typeof TransferStockSchema>;
export type AdjustStock = z.infer<typeof AdjustStockSchema>;

// ============================================================================
// CUSTOMER SCHEMAS
// ============================================================================

export const CustomerCreateSchema = z.object({
  phone: z.string().min(10, 'Invalid phone number'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

export const CustomerUpdateSchema = CustomerCreateSchema.partial();

export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;

// ============================================================================
// PET SCHEMAS
// ============================================================================

export const PetCreateSchema = z.object({
  branch_id: UUIDSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  species: z.string().min(2, 'Species must be at least 2 characters'),
  breed: z.string().optional(),
  sex: z.enum(['M', 'F', 'Unknown']).optional(),
  age_months: z.number().int().min(0).optional(),
  description: z.string().optional(),
  price: DecimalSchema.refine(
    (val) => parseFloat(String(val)) > 0,
    'Price must be greater than 0'
  ),
  image_urls: z.array(z.string().url()).default([]),
  documents: z.record(z.any()).optional(),
  health_info: z.record(z.any()).optional(),
});

export const PetUpdateSchema = PetCreateSchema.partial();

export type PetCreate = z.infer<typeof PetCreateSchema>;
export type PetUpdate = z.infer<typeof PetUpdateSchema>;

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const NotificationMarkReadSchema = z.object({
  notification_id: UUIDSchema,
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
});

export type NotificationMarkRead = z.infer<typeof NotificationMarkReadSchema>;
export type PushSubscription = z.infer<typeof PushSubscriptionSchema>;

// ============================================================================
// REPORT SCHEMAS
// ============================================================================

export const ReportParamsSchema = z.object({
  format: z.enum(['pdf', 'excel', 'json']).default('json'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  branch_id: UUIDSchema.optional(),
  seller_id: UUIDSchema.optional(),
});

export type ReportParams = z.infer<typeof ReportParamsSchema>;

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

// ============================================================================
// HELPER FUNCTION FOR VALIDATION
// ============================================================================

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.flatten((issue) => issue.message);
    throw new Error(JSON.stringify(errors));
  }

  return result.data;
}

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    count: z.number(),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    pageCount: z.number(),
  });
