CREATE TABLE public.dashboard_preferences (
  user_id uuid PRIMARY KEY,
  pinned_ids uuid[] NOT NULL DEFAULT '{}',
  order_ids uuid[] NOT NULL DEFAULT '{}',
  fav_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_preferences TO authenticated;
GRANT ALL ON public.dashboard_preferences TO service_role;

ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own dashboard prefs"
ON public.dashboard_preferences FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user inserts own dashboard prefs"
ON public.dashboard_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user updates own dashboard prefs"
ON public.dashboard_preferences FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user deletes own dashboard prefs"
ON public.dashboard_preferences FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER set_dashboard_preferences_updated_at
BEFORE UPDATE ON public.dashboard_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();