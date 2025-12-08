-- Create user_store_access table for managing user access to stores
CREATE TABLE public.user_store_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  access_level TEXT DEFAULT 'staff' CHECK (access_level IN ('view', 'staff', 'manager', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Add default_store_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_store_id UUID REFERENCES public.stores(id);

-- Enable RLS on user_store_access
ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_store_access
CREATE POLICY "OWNER can manage all store access"
ON public.user_store_access
FOR ALL
USING (is_owner(auth.uid()));

CREATE POLICY "Users can view their own store access"
ON public.user_store_access
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "ADMIN can manage store access for their stores"
ON public.user_store_access
FOR ALL
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) AND
  store_id IN (
    SELECT usa.store_id FROM public.user_store_access usa 
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_store_access_updated_at
BEFORE UPDATE ON public.user_store_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_store_access_user_id ON public.user_store_access(user_id);
CREATE INDEX idx_user_store_access_store_id ON public.user_store_access(store_id);

-- Grant OWNER automatic access to all stores via a function
CREATE OR REPLACE FUNCTION public.get_user_accessible_stores(p_user_id UUID)
RETURNS TABLE(store_id UUID, store_name TEXT, access_level TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is OWNER, return all stores
  IF is_owner(p_user_id) THEN
    RETURN QUERY
    SELECT s.id, s.name, 'admin'::TEXT
    FROM stores s
    WHERE s.is_active = true
    ORDER BY s.name;
  ELSE
    -- Return only stores user has access to
    RETURN QUERY
    SELECT s.id, s.name, usa.access_level
    FROM stores s
    JOIN user_store_access usa ON usa.store_id = s.id
    WHERE usa.user_id = p_user_id
      AND usa.is_active = true
      AND s.is_active = true
    ORDER BY s.name;
  END IF;
END;
$$;