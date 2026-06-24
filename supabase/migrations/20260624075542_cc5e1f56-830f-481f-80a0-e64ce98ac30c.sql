
CREATE TABLE public.roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  column_type TEXT NOT NULL DEFAULT 'custom',
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmaps TO authenticated;
GRANT ALL ON public.roadmaps TO service_role;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read roadmaps" ON public.roadmaps FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert roadmaps" ON public.roadmaps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update roadmaps" ON public.roadmaps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete roadmaps" ON public.roadmaps FOR DELETE TO authenticated USING (true);

CREATE TRIGGER roadmaps_set_updated_at
BEFORE UPDATE ON public.roadmaps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.roadmap_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  status TEXT,
  description TEXT,
  process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_cards TO authenticated;
GRANT ALL ON public.roadmap_cards TO service_role;
ALTER TABLE public.roadmap_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read roadmap_cards" ON public.roadmap_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert roadmap_cards" ON public.roadmap_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update roadmap_cards" ON public.roadmap_cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete roadmap_cards" ON public.roadmap_cards FOR DELETE TO authenticated USING (true);

CREATE INDEX roadmap_cards_roadmap_idx ON public.roadmap_cards(roadmap_id);
CREATE INDEX roadmap_cards_column_idx ON public.roadmap_cards(roadmap_id, column_id, "order");
