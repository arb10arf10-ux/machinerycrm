-- Move the role lookup out of the exposed API schema, respect deactivated users,
-- and add covering indexes for foreign-key lookups.
CREATE SCHEMA IF NOT EXISTS private;
ALTER FUNCTION public.current_user_role() SET SCHEMA private;
CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER STABLE SET search_path=''
AS $$
 SELECT p.role FROM public.profiles p
 WHERE p.id=(select auth.uid()) AND p.is_active=true;
$$;
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated;

CREATE INDEX IF NOT EXISTS idx_activities_created_by ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_asset_id ON public.opportunities(asset_id);

DROP POLICY IF EXISTS locations_select ON public.locations;
CREATE POLICY locations_select ON public.locations FOR SELECT TO authenticated
 USING (is_active=true AND private.current_user_role() IS NOT NULL);
DROP POLICY IF EXISTS assets_select ON public.assets;
CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
 USING (private.current_user_role() IS NOT NULL);
DROP POLICY IF EXISTS activities_select ON public.activities;
CREATE POLICY activities_select ON public.activities FOR SELECT TO authenticated USING (
 private.current_user_role() IS NOT NULL AND (
  created_by=(select auth.uid())
  OR (account_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=activities.account_id))
  OR (opportunity_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.opportunities o WHERE o.id=activities.opportunity_id))
  OR (asset_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.assets x WHERE x.id=activities.asset_id))
 )
);
