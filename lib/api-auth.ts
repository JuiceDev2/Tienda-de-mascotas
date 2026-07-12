import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/supabase/types';

export interface AuthContext {
  id: string;
  companyId: string;
  branchId: string | null;
  role: UserRole;
}

/**
 * Reads the logged-in user (via cookies) and their company/branch/role.
 * Returns null when there is no authenticated session.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, company_id, branch_id, role')
    .eq('id', user.id)
    .single();

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    companyId: dbUser.company_id,
    branchId: dbUser.branch_id,
    role: dbUser.role,
  };
}

/**
 * This project is deployed as a single pet shop, so we fall back to the
 * only company in the database for public/unauthenticated storefront reads.
 */
export async function getDefaultCompanyId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from('companies').select('id').limit(1).single();
  return data?.id || null;
}

export async function getDefaultBranchId(companyId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('branches')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .limit(1)
    .single();
  return data?.id || null;
}
