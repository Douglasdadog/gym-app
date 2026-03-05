-- ============================================
-- CRM: Lead status, notes, assignment, tasks/reminders
-- ============================================

-- Ensure leads table exists (if created manually it may have id, created_at, name, email, phone, interest, source, notes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    CREATE TABLE public.leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      name TEXT,
      email TEXT,
      phone TEXT NOT NULL DEFAULT '',
      interest TEXT,
      source TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'lost')),
      assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to_id);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  ELSE
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    UPDATE public.leads SET status = 'new' WHERE status IS NULL OR status NOT IN ('new', 'contacted', 'won', 'lost');
    ALTER TABLE public.leads ALTER COLUMN status SET NOT NULL;
    ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'new';
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
    ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'won', 'lost'));
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to_id);
  END IF;
END $$;

-- Lead tasks / reminders
CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due_at ON lead_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON lead_tasks(assigned_to_id);

ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

-- RLS for leads (enable if not already)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Only admins can manage leads and lead_tasks (service role used in API, so allow for authenticated admin)
DROP POLICY IF EXISTS "Admins can do all on leads" ON public.leads;
CREATE POLICY "Admins can do all on leads" ON public.leads FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Admins can do all on lead_tasks" ON public.lead_tasks;
CREATE POLICY "Admins can do all on lead_tasks" ON public.lead_tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
