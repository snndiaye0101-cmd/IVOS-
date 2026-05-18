-- Création de la table des portails (bornes)
CREATE TABLE IF NOT EXISTS public.site_portals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subsidiary_id UUID NOT NULL REFERENCES public.subsidiaries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    terminal_id VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_portals_subsidiary ON public.site_portals(subsidiary_id);

-- Liaison avec la table des pointages
ALTER TABLE public.fiches_pointage 
ADD COLUMN IF NOT EXISTS portal_id UUID REFERENCES public.site_portals(id) ON DELETE SET NULL;

-- Activation RLS
ALTER TABLE public.site_portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir les portails de leur filiale" 
ON public.site_portals FOR SELECT 
USING (subsidiary_id = (auth.jwt() -> 'user_metadata' ->> 'subsidiary_id')::uuid);

CREATE POLICY "Seuls les Admins peuvent modifier les portails" 
ON public.site_portals FOR ALL 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('SuperAdmin', 'Admin'))
    AND subsidiary_id = (auth.jwt() -> 'user_metadata' ->> 'subsidiary_id')::uuid
);
