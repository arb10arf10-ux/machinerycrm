DROP POLICY IF EXISTS locations_select ON public.locations;
CREATE POLICY locations_select ON public.locations FOR SELECT TO authenticated
USING (is_active = true OR private.current_user_role() = 'admin');