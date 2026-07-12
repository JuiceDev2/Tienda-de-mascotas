-- ============================================================================
-- PETSHOP ERP/POS - INITIAL SCHEMA
-- ============================================================================
-- Database: PostgreSQL with Supabase
-- Features: Multi-tenant, RLS, Audit, Soft Delete, Transactions

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'seller', 'client');
CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE inventory_movement_type AS ENUM ('entry', 'exit', 'adjustment', 'transfer', 'waste');
CREATE TYPE pet_status AS ENUM ('available', 'reserved', 'sold');
CREATE TYPE notification_type AS ENUM ('stock_critical', 'stock_empty', 'high_demand', 'no_movement', 'stock_restored');
CREATE TYPE notification_status AS ENUM ('unread', 'read');

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION auth.company_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'company_id';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.branch_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'branch_id';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_global_admin() RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_global_admin' = 'true';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.has_branch_access() RETURNS BOOLEAN AS $$
  SELECT auth.branch_id() IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Companies (Empresas)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1F2937',
  business_hours JSONB DEFAULT '{}',
  social_media JSONB DEFAULT '{}',
  policies JSONB DEFAULT '{}',
  enable_pet_catalog BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Branches (Sucursales)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  manager_name VARCHAR(255),
  manager_phone VARCHAR(20),
  opening_time TIME,
  closing_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, code)
);

-- Users (Usuarios del Sistema)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'seller',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Categories (Categorías de Productos)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Brands (Marcas)
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  description TEXT,
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Suppliers (Proveedores)
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  tax_id VARCHAR(50),
  payment_terms VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Products (Productos)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  barcode VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  supplier_id UUID REFERENCES suppliers(id),
  cost_price DECIMAL(12, 2) NOT NULL CHECK (cost_price >= 0),
  selling_price DECIMAL(12, 2) NOT NULL CHECK (selling_price >= 0),
  utility_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (utility_percentage >= 0),
  iva_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (iva_percentage >= 0),
  is_active BOOLEAN DEFAULT true,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, code)
);

-- Inventory (Inventario por Sucursal)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  minimum_stock INT NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  ideal_stock INT NOT NULL DEFAULT 0 CHECK (ideal_stock >= 0),
  last_movement_at TIMESTAMP WITH TIME ZONE,
  last_count_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, product_id)
);

-- Inventory Movements (Movimientos de Inventario)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type inventory_movement_type NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id)
);

-- Customers (Clientes - Sin Cuenta)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  total_purchases INT DEFAULT 0,
  total_spent DECIMAL(14, 2) DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(company_id, phone)
);

-- Sales (Ventas)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  customer_phone VARCHAR(20),
  customer_name VARCHAR(255),
  seller_id UUID REFERENCES auth.users(id),
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_items INT NOT NULL DEFAULT 0,
  subtotal DECIMAL(14, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  status sale_status NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Sale Items (Detalles de Ventas)
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0),
  line_total DECIMAL(14, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pets (Mascotas en Venta)
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(100) NOT NULL,
  breed VARCHAR(100),
  sex VARCHAR(10),
  age_months INT,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL CHECK (price > 0),
  is_available BOOLEAN DEFAULT true,
  status pet_status DEFAULT 'available',
  image_urls TEXT[] DEFAULT '{}',
  documents JSONB DEFAULT '{}',
  health_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Notifications (Notificaciones)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  status notification_status DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Push Subscriptions (Suscripciones Push)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  endpoint VARCHAR(500) NOT NULL,
  auth_key VARCHAR(255) NOT NULL,
  p256dh_key VARCHAR(255) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, endpoint)
);

-- Audit Logs (Bitácora de Auditoría)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX (company_id, created_at),
  INDEX (entity_type, entity_id)
);

-- Login Attempts (Registro de Intentos de Login)
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  INDEX (email, created_at)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Companies
CREATE INDEX idx_companies_is_active ON companies(is_active) WHERE deleted_at IS NULL;

-- Branches
CREATE INDEX idx_branches_company_id ON branches(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_branches_company_is_active ON branches(company_id, is_active) WHERE deleted_at IS NULL;

-- Users
CREATE INDEX idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_company_branch ON users(company_id, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- Categories
CREATE INDEX idx_categories_company_id ON categories(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_name_trgm ON categories USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;

-- Brands
CREATE INDEX idx_brands_company_id ON brands(company_id) WHERE deleted_at IS NULL;

-- Products
CREATE INDEX idx_products_company_id ON products(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category_id ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_brand_id ON products(brand_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_code ON products(company_id, code) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_barcode ON products(barcode) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_is_active ON products(company_id, is_active) WHERE deleted_at IS NULL;

-- Inventory
CREATE INDEX idx_inventory_company_branch_product ON inventory(company_id, branch_id, product_id);
CREATE INDEX idx_inventory_low_stock ON inventory(branch_id, quantity_on_hand) 
  WHERE quantity_on_hand <= minimum_stock;

-- Inventory Movements
CREATE INDEX idx_inventory_movements_company_branch ON inventory_movements(company_id, branch_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

-- Customers
CREATE INDEX idx_customers_company_id ON customers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customers(company_id, phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name_trgm ON customers USING gin(full_name gin_trgm_ops) WHERE deleted_at IS NULL;

-- Sales
CREATE INDEX idx_sales_company_id ON sales(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_branch_id ON sales(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_sale_date ON sales(company_id, sale_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_status ON sales(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_seller_id ON sales(seller_id) WHERE deleted_at IS NULL;

-- Sale Items
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Pets
CREATE INDEX idx_pets_company_id ON pets(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pets_branch_id ON pets(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pets_available ON pets(company_id, is_available) WHERE deleted_at IS NULL;
CREATE INDEX idx_pets_species ON pets(species) WHERE deleted_at IS NULL;

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'unread';
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit Logs
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_branches_updated_at
  BEFORE UPDATE ON branches FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_brands_updated_at
  BEFORE UPDATE ON brands FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_inventory_updated_at
  BEFORE UPDATE ON inventory FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_sales_updated_at
  BEFORE UPDATE ON sales FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_pets_updated_at
  BEFORE UPDATE ON pets FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data TEXT;
  v_new_data TEXT;
  v_action VARCHAR;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_new_data := NULL;
    v_old_data := row_to_json(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_data := row_to_json(OLD);
    v_new_data := row_to_json(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_old_data := NULL;
    v_new_data := row_to_json(NEW);
  END IF;

  INSERT INTO audit_logs (
    company_id,
    user_id,
    entity_type,
    entity_id,
    action,
    changes
  ) VALUES (
    COALESCE((NEW).company_id, (OLD).company_id),
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    v_action,
    jsonb_build_object('old', v_old_data::jsonb, 'new', v_new_data::jsonb)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to main tables
CREATE TRIGGER trigger_audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trigger_audit_inventory
  AFTER INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trigger_audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Inventory update trigger
CREATE OR REPLACE FUNCTION update_inventory_last_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory
  SET last_movement_at = CURRENT_TIMESTAMP
  WHERE id IN (
    SELECT id FROM inventory
    WHERE branch_id = NEW.branch_id
    AND product_id = NEW.product_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_last_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION update_inventory_last_movement();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Companies RLS
CREATE POLICY companies_select_own
  ON companies FOR SELECT
  USING (
    id = auth.company_id()::UUID
    OR auth.is_global_admin() = true
  );

CREATE POLICY companies_update_own
  ON companies FOR UPDATE
  USING (id = auth.company_id()::UUID)
  WITH CHECK (id = auth.company_id()::UUID);

-- Branches RLS
CREATE POLICY branches_select_own_company
  ON branches FOR SELECT
  USING (company_id = auth.company_id()::UUID);

CREATE POLICY branches_insert_own_company
  ON branches FOR INSERT
  WITH CHECK (company_id = auth.company_id()::UUID);

CREATE POLICY branches_update_own_company
  ON branches FOR UPDATE
  USING (company_id = auth.company_id()::UUID)
  WITH CHECK (company_id = auth.company_id()::UUID);

-- Users RLS
CREATE POLICY users_select_own_company
  ON users FOR SELECT
  USING (company_id = auth.company_id()::UUID);

CREATE POLICY users_select_own_branch_or_admin
  ON users FOR SELECT
  USING (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

CREATE POLICY users_insert_own_company
  ON users FOR INSERT
  WITH CHECK (company_id = auth.company_id()::UUID);

CREATE POLICY users_update_own_company
  ON users FOR UPDATE
  USING (company_id = auth.company_id()::UUID)
  WITH CHECK (company_id = auth.company_id()::UUID);

-- Products RLS
CREATE POLICY products_select_own_company
  ON products FOR SELECT
  USING (company_id = auth.company_id()::UUID);

CREATE POLICY products_insert_own_company
  ON products FOR INSERT
  WITH CHECK (company_id = auth.company_id()::UUID);

CREATE POLICY products_update_own_company
  ON products FOR UPDATE
  USING (company_id = auth.company_id()::UUID)
  WITH CHECK (company_id = auth.company_id()::UUID);

-- Inventory RLS
CREATE POLICY inventory_select_own_company
  ON inventory FOR SELECT
  USING (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

CREATE POLICY inventory_update_own_branch
  ON inventory FOR UPDATE
  USING (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

-- Inventory Movements RLS
CREATE POLICY inventory_movements_select_own
  ON inventory_movements FOR SELECT
  USING (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

CREATE POLICY inventory_movements_insert_own
  ON inventory_movements FOR INSERT
  WITH CHECK (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

-- Sales RLS
CREATE POLICY sales_select_own
  ON sales FOR SELECT
  USING (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

CREATE POLICY sales_insert_own
  ON sales FOR INSERT
  WITH CHECK (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

CREATE POLICY sales_update_own
  ON sales FOR UPDATE
  USING (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

-- Sale Items RLS
CREATE POLICY sale_items_select_own
  ON sale_items FOR SELECT
  USING (company_id = auth.company_id()::UUID);

CREATE POLICY sale_items_insert_own
  ON sale_items FOR INSERT
  WITH CHECK (company_id = auth.company_id()::UUID);

-- Notifications RLS
CREATE POLICY notifications_select_own
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_insert_own
  ON notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_update_own
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Pets RLS
CREATE POLICY pets_select_own_company
  ON pets FOR SELECT
  USING (
    company_id = auth.company_id()::UUID
    AND (branch_id = auth.branch_id()::UUID OR auth.branch_id() IS NULL)
  );

-- Customers RLS
CREATE POLICY customers_select_own_company
  ON customers FOR SELECT
  USING (company_id = auth.company_id()::UUID);

-- Push Subscriptions RLS
CREATE POLICY push_subscriptions_select_own
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRANSACTIONAL FUNCTIONS (RPC)
-- ============================================================================

-- Create sale with items (atomically)
CREATE OR REPLACE FUNCTION create_sale_with_items(
  p_company_id UUID,
  p_branch_id UUID,
  p_customer_id UUID,
  p_customer_phone VARCHAR,
  p_customer_name VARCHAR,
  p_seller_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INT;
  v_unit_price DECIMAL;
  v_line_total DECIMAL;
  v_subtotal DECIMAL := 0;
  v_tax_amount DECIMAL := 0;
  v_total_amount DECIMAL := 0;
  v_product_iva DECIMAL;
  v_current_stock INT;
BEGIN
  -- Create sale
  INSERT INTO sales (
    company_id,
    branch_id,
    customer_id,
    customer_phone,
    customer_name,
    seller_id,
    status,
    notes,
    created_by
  ) VALUES (
    p_company_id,
    p_branch_id,
    p_customer_id,
    p_customer_phone,
    p_customer_name,
    p_seller_id,
    'pending',
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_sale_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::UUID;
    v_quantity := (v_item ->> 'quantity')::INT;
    v_unit_price := (v_item ->> 'unit_price')::DECIMAL;

    -- Get product IVA
    SELECT iva_percentage INTO v_product_iva
    FROM products WHERE id = v_product_id;

    v_line_total := v_quantity * v_unit_price;
    v_subtotal := v_subtotal + v_line_total;
    v_tax_amount := v_tax_amount + (v_line_total * v_product_iva / 100);

    -- Insert sale item
    INSERT INTO sale_items (
      company_id,
      sale_id,
      product_id,
      quantity,
      unit_price,
      line_total
    ) VALUES (
      p_company_id,
      v_sale_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_line_total
    );

    -- Decrease inventory
    UPDATE inventory
    SET quantity_on_hand = quantity_on_hand - v_quantity
    WHERE branch_id = p_branch_id
    AND product_id = v_product_id
    AND quantity_on_hand >= v_quantity;

    -- Register inventory movement
    INSERT INTO inventory_movements (
      company_id,
      branch_id,
      product_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      created_by
    ) VALUES (
      p_company_id,
      p_branch_id,
      v_product_id,
      'exit',
      v_quantity,
      'sale',
      v_sale_id,
      auth.uid()
    );
  END LOOP;

  -- Calculate totals
  v_total_amount := v_subtotal + v_tax_amount;

  -- Update sale totals
  UPDATE sales SET
    total_items = (SELECT COUNT(*) FROM sale_items WHERE sale_id = v_sale_id),
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_amount = v_total_amount,
    status = 'completed'
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

-- Cancel sale and restore inventory
CREATE OR REPLACE FUNCTION cancel_sale(
  p_sale_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sale_record RECORD;
  v_item RECORD;
BEGIN
  -- Get sale
  SELECT * INTO v_sale_record FROM sales WHERE id = p_sale_id;

  IF v_sale_record.status = 'cancelled' THEN
    RAISE EXCEPTION 'Sale already cancelled';
  END IF;

  -- Restore inventory for each item
  FOR v_item IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE inventory
    SET quantity_on_hand = quantity_on_hand + v_item.quantity
    WHERE branch_id = v_sale_record.branch_id
    AND product_id = v_item.product_id;

    -- Register reversal movement
    INSERT INTO inventory_movements (
      company_id,
      branch_id,
      product_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      notes,
      created_by
    ) VALUES (
      v_sale_record.company_id,
      v_sale_record.branch_id,
      v_item.product_id,
      'entry',
      v_item.quantity,
      'sale_cancellation',
      p_sale_id,
      'Reversal from cancelled sale',
      auth.uid()
    );
  END LOOP;

  -- Update sale status
  UPDATE sales SET
    status = 'cancelled',
    updated_by = auth.uid()
  WHERE id = p_sale_id;

  RETURN true;
END;
$$;

-- Transfer stock between branches
CREATE OR REPLACE FUNCTION transfer_stock(
  p_company_id UUID,
  p_from_branch_id UUID,
  p_to_branch_id UUID,
  p_product_id UUID,
  p_quantity INT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Validate stock availability
  IF (SELECT quantity_on_hand FROM inventory 
      WHERE branch_id = p_from_branch_id AND product_id = p_product_id) < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for transfer';
  END IF;

  -- Decrease from origin
  UPDATE inventory
  SET quantity_on_hand = quantity_on_hand - p_quantity
  WHERE branch_id = p_from_branch_id AND product_id = p_product_id;

  -- Increase at destination
  UPDATE inventory
  SET quantity_on_hand = quantity_on_hand + p_quantity
  WHERE branch_id = p_to_branch_id AND product_id = p_product_id;

  -- Register movements
  INSERT INTO inventory_movements (
    company_id,
    branch_id,
    product_id,
    movement_type,
    quantity,
    reference_type,
    notes,
    created_by
  ) VALUES
  (p_company_id, p_from_branch_id, p_product_id, 'transfer', p_quantity, 'transfer_out', p_notes, auth.uid()),
  (p_company_id, p_to_branch_id, p_product_id, 'transfer', p_quantity, 'transfer_in', p_notes, auth.uid());

  RETURN true;
END;
$$;

-- Register inventory movement
CREATE OR REPLACE FUNCTION register_inventory_movement(
  p_company_id UUID,
  p_branch_id UUID,
  p_product_id UUID,
  p_movement_type inventory_movement_type,
  p_quantity INT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  -- Update inventory
  IF p_movement_type = 'entry' THEN
    UPDATE inventory
    SET quantity_on_hand = quantity_on_hand + p_quantity
    WHERE branch_id = p_branch_id AND product_id = p_product_id;
  ELSIF p_movement_type IN ('exit', 'waste') THEN
    UPDATE inventory
    SET quantity_on_hand = CASE
      WHEN quantity_on_hand >= p_quantity THEN quantity_on_hand - p_quantity
      ELSE 0
    END
    WHERE branch_id = p_branch_id AND product_id = p_product_id;
  ELSIF p_movement_type = 'adjustment' THEN
    -- Adjustment is just a reference change
    NULL;
  END IF;

  -- Insert movement record
  INSERT INTO inventory_movements (
    company_id,
    branch_id,
    product_id,
    movement_type,
    quantity,
    notes,
    created_by
  ) VALUES (
    p_company_id,
    p_branch_id,
    p_product_id,
    p_movement_type,
    p_quantity,
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

-- Calculate sales average and generate alerts
CREATE OR REPLACE FUNCTION calculate_sales_average_and_alerts(
  p_company_id UUID,
  p_days_lookback INT DEFAULT 30
)
RETURNS TABLE(
  branch_id UUID,
  product_id UUID,
  daily_average DECIMAL,
  days_to_stockout INT,
  alert_type notification_type
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH sale_stats AS (
    SELECT
      s.branch_id,
      si.product_id,
      COUNT(DISTINCT DATE(s.sale_date)) as sale_days,
      SUM(si.quantity)::DECIMAL / NULLIF(COUNT(DISTINCT DATE(s.sale_date)), 0) as daily_avg
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    WHERE s.company_id = p_company_id
    AND s.status = 'completed'
    AND s.sale_date >= CURRENT_TIMESTAMP - (p_days_lookback || ' days')::INTERVAL
    GROUP BY s.branch_id, si.product_id
  ),
  stock_alerts AS (
    SELECT
      ss.branch_id,
      ss.product_id,
      ss.daily_avg,
      CASE
        WHEN ss.daily_avg > 0 THEN
          FLOOR(i.quantity_on_hand / ss.daily_avg)::INT
        ELSE 999
      END as days_to_stockout,
      CASE
        WHEN i.quantity_on_hand <= i.minimum_stock AND i.quantity_on_hand > 0 THEN 'stock_critical'
        WHEN i.quantity_on_hand = 0 THEN 'stock_empty'
        WHEN ss.daily_avg > (SELECT AVG(daily_avg) FROM sale_stats) THEN 'high_demand'
        WHEN ss.daily_avg = 0 THEN 'no_movement'
        ELSE NULL
      END as alert_type_result
    FROM sale_stats ss
    JOIN inventory i ON ss.branch_id = i.branch_id AND ss.product_id = i.product_id
  )
  SELECT
    sa.branch_id,
    sa.product_id,
    sa.daily_avg,
    sa.days_to_stockout,
    sa.alert_type_result::notification_type
  FROM stock_alerts sa
  WHERE sa.alert_type_result IS NOT NULL;
END;
$$;

-- ============================================================================
-- MATERIALIZED VIEW FOR PET DASHBOARD
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS pet_dashboard_view AS
SELECT
  p.id,
  p.company_id,
  p.branch_id,
  p.name,
  p.species,
  p.breed,
  p.sex,
  p.age_months,
  p.price,
  p.is_available,
  p.status,
  p.description,
  p.image_urls[1] as main_image,
  p.image_urls,
  c.name as company_name,
  b.name as branch_name
FROM pets p
LEFT JOIN companies c ON c.id = p.company_id
LEFT JOIN branches b ON b.id = p.branch_id
WHERE p.deleted_at IS NULL;

CREATE UNIQUE INDEX idx_pet_dashboard_view_id
ON pet_dashboard_view(id);

-- ============================================================================
-- GRANTS (For Supabase Service Role)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE companies IS 'Main companies/businesses using the platform';
COMMENT ON TABLE branches IS 'Physical locations/stores of each company';
COMMENT ON TABLE users IS 'System users with roles and permissions';
COMMENT ON TABLE products IS 'Product catalog shared across branches';
COMMENT ON TABLE inventory IS 'Stock levels per product per branch';
COMMENT ON TABLE inventory_movements IS 'History of all inventory changes';
COMMENT ON TABLE sales IS 'Customer transactions/orders';
COMMENT ON TABLE sale_items IS 'Line items of each sale';
COMMENT ON TABLE pets IS 'Pets available for sale';
COMMENT ON TABLE notifications IS 'System alerts and notifications';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of system changes';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
