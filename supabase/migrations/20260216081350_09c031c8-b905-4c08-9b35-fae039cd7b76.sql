
-- Track which SocialBox leads have been pulled and/or transferred
CREATE TABLE public.socialbox_pulled_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  socialbox_lead_id TEXT NOT NULL,
  phone TEXT,
  full_name TEXT,
  pulled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_transferred BOOLEAN NOT NULL DEFAULT false,
  transferred_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(store_id, socialbox_lead_id)
);

ALTER TABLE public.socialbox_pulled_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with store access can view pulled leads"
  ON public.socialbox_pulled_leads FOR SELECT
  USING (public.user_has_store_access(auth.uid(), store_id));

CREATE POLICY "Users with store access can insert pulled leads"
  ON public.socialbox_pulled_leads FOR INSERT
  WITH CHECK (public.user_has_store_access(auth.uid(), store_id));

CREATE POLICY "Users with store access can update pulled leads"
  ON public.socialbox_pulled_leads FOR UPDATE
  USING (public.user_has_store_access(auth.uid(), store_id));
