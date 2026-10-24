-- Branch-aware access, catalogue foundations, and a bridge between opportunities and orders.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS can_view_all_branches boolean NOT NULL DEFAULT false;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_order_id ON public.opportunities(order_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_branch_id ON public.opportunities(branch_id);

-- Only an administrator may change branch assignments or cross-branch visibility.
CREATE OR REPLACE FUNCTION public.guard_profile_branch_access()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF (NEW.branch_id IS DISTINCT FROM OLD.branch_id OR NEW.can_view_all_branches IS DISTINCT FROM OLD.can_view_all_branches)
     AND private.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only an administrator can change branch access';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_profile_branch_access_trigger ON public.profiles;
CREATE TRIGGER guard_profile_branch_access_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_branch_access();

GRANT UPDATE(branch_id, can_view_all_branches) ON public.profiles TO authenticated;

-- Replace broad order visibility with branch-scoped visibility.
DROP POLICY IF EXISTS orders_select ON public.orders;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated
USING (
  private.current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND (p.can_view_all_branches OR p.branch_id = orders.branch_id)
  )
);

-- Keep writes branch-scoped too, unless the user has explicit all-branch access.
DROP POLICY IF EXISTS orders_insert ON public.orders;
CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  private.current_user_role() IN ('admin','sales','operations')
  AND created_by = (SELECT auth.uid())
  AND (
    private.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND (p.can_view_all_branches OR p.branch_id = orders.branch_id)
    )
  )
);
DROP POLICY IF EXISTS orders_update ON public.orders;
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated
USING (
  private.current_user_role() = 'admin'
  OR (
    private.current_user_role() IN ('sales','operations')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND (p.can_view_all_branches OR p.branch_id = orders.branch_id)
    )
  )
)
WITH CHECK (
  private.current_user_role() = 'admin'
  OR (
    private.current_user_role() IN ('sales','operations')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND (p.can_view_all_branches OR p.branch_id = orders.branch_id)
    )
  )
);
DROP POLICY IF EXISTS orders_delete ON public.orders;
CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated
USING (private.current_user_role() = 'admin');

-- Categories and catalogue items use separate tables so machine and part codes never collide.
CREATE TABLE IF NOT EXISTS public.catalog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('machine','part')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_type, name)
);
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text NOT NULL UNIQUE,
  item_type text NOT NULL CHECK (item_type IN ('machine','part')),
  name text NOT NULL,
  category_id uuid REFERENCES public.catalog_categories(id) ON DELETE RESTRICT,
  make text,
  model text,
  description text,
  unit text NOT NULL DEFAULT 'each',
  cost_price numeric(14,2) CHECK (cost_price IS NULL OR cost_price >= 0),
  sale_price numeric(14,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catalog_items_type ON public.catalog_items(item_type);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON public.catalog_items(category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_name ON public.catalog_items(name);
CREATE TRIGGER catalog_categories_updated_at BEFORE UPDATE ON public.catalog_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_categories_read ON public.catalog_categories FOR SELECT TO authenticated USING (private.current_user_role() IS NOT NULL);
CREATE POLICY catalog_categories_admin_write ON public.catalog_categories FOR ALL TO authenticated USING (private.current_user_role() = 'admin') WITH CHECK (private.current_user_role() = 'admin');
CREATE POLICY catalog_items_read ON public.catalog_items FOR SELECT TO authenticated USING (private.current_user_role() IS NOT NULL);
CREATE POLICY catalog_items_write ON public.catalog_items FOR ALL TO authenticated USING (private.current_user_role() IN ('admin','operations','parts')) WITH CHECK (private.current_user_role() IN ('admin','operations','parts'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_categories, public.catalog_items TO authenticated;
REVOKE ALL ON public.catalog_categories, public.catalog_items FROM anon;
