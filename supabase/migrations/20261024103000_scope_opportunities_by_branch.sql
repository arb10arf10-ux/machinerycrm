-- Scope opportunities to their assigned branch while retaining owner access.
DROP POLICY IF EXISTS opportunities_select ON public.opportunities;
CREATE POLICY opportunities_select ON public.opportunities FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'admin'
  OR owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND (p.can_view_all_branches OR (opportunities.branch_id IS NOT NULL AND p.branch_id = opportunities.branch_id))
  )
);

DROP POLICY IF EXISTS opportunities_insert ON public.opportunities;
CREATE POLICY opportunities_insert ON public.opportunities FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_role() IN ('admin','sales')
  AND (owner_id = (SELECT auth.uid()) OR public.current_user_role() = 'admin')
  AND (
    public.current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND (p.can_view_all_branches OR (opportunities.branch_id IS NOT NULL AND p.branch_id = opportunities.branch_id))
    )
  )
);

DROP POLICY IF EXISTS opportunities_update ON public.opportunities;
CREATE POLICY opportunities_update ON public.opportunities FOR UPDATE TO authenticated
USING (
  public.current_user_role() = 'admin'
  OR owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND (p.can_view_all_branches OR (opportunities.branch_id IS NOT NULL AND p.branch_id = opportunities.branch_id))
  )
)
WITH CHECK (
  public.current_user_role() = 'admin'
  OR owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND (p.can_view_all_branches OR (opportunities.branch_id IS NOT NULL AND p.branch_id = opportunities.branch_id))
  )
);
