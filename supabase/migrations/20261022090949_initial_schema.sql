-- Machinery CRM initial schema. All exposed application tables use RLS.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE public.user_role AS ENUM ('admin','sales','service','parts','operations','viewer');
CREATE TYPE public.account_type AS ENUM ('customer','prospect','dealer','internal');
CREATE TYPE public.asset_status AS ENUM ('available','rented','sold','in_service','reserved','retired','in_transit');
CREATE TYPE public.opportunity_stage AS ENUM ('lead','qualified','proposal','negotiation','won','lost');
CREATE TYPE public.opportunity_type AS ENUM ('sale','rental','service','parts');
CREATE TYPE public.activity_type AS ENUM ('note','call','email','meeting','task','status_change','system');

CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,email text NOT NULL,full_name text,role public.user_role NOT NULL DEFAULT 'viewer',avatar_url text,is_active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.locations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text NOT NULL UNIQUE,name text NOT NULL,type text NOT NULL DEFAULT 'branch' CHECK(type IN ('branch','yard','warehouse')),address_line1 text,address_line2 text,city text,state text,postal_code text,country text DEFAULT 'US',is_active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,account_type public.account_type NOT NULL DEFAULT 'prospect',owner_id uuid REFERENCES public.profiles(id),billing_address_line1 text,billing_city text,billing_state text,billing_postal_code text,billing_country text DEFAULT 'US',phone text,website text,notes text,is_active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.contacts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,first_name text NOT NULL,last_name text,email text,phone text,title text,is_primary boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.sites(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,name text NOT NULL,address_line1 text,city text,state text,postal_code text,country text DEFAULT 'US',notes text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.assets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),serial_number text NOT NULL UNIQUE,internal_id text,make text,model text,year integer,category text,status public.asset_status NOT NULL DEFAULT 'available',location_id uuid REFERENCES public.locations(id),current_account_id uuid REFERENCES public.accounts(id),hour_meter numeric(12,1) DEFAULT 0,purchase_date date,purchase_cost numeric(12,2),notes text,is_active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.opportunities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,owner_id uuid REFERENCES public.profiles(id),stage public.opportunity_stage NOT NULL DEFAULT 'lead',opportunity_type public.opportunity_type NOT NULL DEFAULT 'sale',amount numeric(14,2) DEFAULT 0,probability integer DEFAULT 0 CHECK(probability BETWEEN 0 AND 100),expected_close_date date,asset_id uuid REFERENCES public.assets(id),description text,lost_reason text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.activities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),activity_type public.activity_type NOT NULL DEFAULT 'note',subject text,body text,account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,created_by uuid REFERENCES public.profiles(id),due_at timestamptz,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX idx_accounts_owner ON public.accounts(owner_id);
CREATE INDEX idx_accounts_type ON public.accounts(account_type);
CREATE INDEX idx_accounts_name ON public.accounts(name);
CREATE INDEX idx_contacts_account ON public.contacts(account_id);
CREATE INDEX idx_sites_account ON public.sites(account_id);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_location ON public.assets(location_id);
CREATE INDEX idx_assets_account ON public.assets(current_account_id);
CREATE INDEX idx_assets_internal ON public.assets(internal_id);
CREATE INDEX idx_opportunities_account ON public.opportunities(account_id);
CREATE INDEX idx_opportunities_owner ON public.opportunities(owner_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_type ON public.opportunities(opportunity_type);
CREATE INDEX idx_opportunities_asset_id ON public.opportunities(asset_id);
CREATE INDEX idx_activities_account ON public.activities(account_id);
CREATE INDEX idx_activities_opportunity ON public.activities(opportunity_id);
CREATE INDEX idx_activities_asset ON public.activities(asset_id);
CREATE INDEX idx_activities_created_by ON public.activities(created_by);
CREATE INDEX idx_activities_created ON public.activities(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sites_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.profiles(id,email,full_name,role)
 VALUES(NEW.id,COALESCE(NEW.email,''),NULLIF(NEW.raw_user_meta_data->>'full_name',''),'viewer');
 RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.current_user_role() RETURNS public.user_role LANGUAGE sql SECURITY DEFINER STABLE SET search_path='' AS $$ SELECT p.role FROM public.profiles p WHERE p.id=(select auth.uid()); $$;
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC,anon,authenticated;

CREATE POLICY profiles_select_self_or_admin ON public.profiles FOR SELECT TO authenticated USING(id=(select auth.uid()) OR private.current_user_role()='admin');
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING(id=(select auth.uid())) WITH CHECK(id=(select auth.uid()));
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated USING(private.current_user_role()='admin') WITH CHECK(private.current_user_role()='admin');
REVOKE ALL ON public.profiles FROM anon,authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE(full_name,avatar_url) ON public.profiles TO authenticated;

CREATE POLICY locations_select ON public.locations FOR SELECT TO authenticated USING(is_active=true AND (select auth.uid()) IS NOT NULL);
CREATE POLICY locations_admin_write ON public.locations FOR ALL TO authenticated USING(private.current_user_role()='admin') WITH CHECK(private.current_user_role()='admin');
CREATE POLICY accounts_select ON public.accounts FOR SELECT TO authenticated USING(private.current_user_role()='admin' OR owner_id=(select auth.uid()) OR private.current_user_role() IN ('service','parts','operations'));
CREATE POLICY accounts_insert ON public.accounts FOR INSERT TO authenticated WITH CHECK(private.current_user_role() IN ('admin','sales') AND (owner_id=(select auth.uid()) OR private.current_user_role()='admin'));
CREATE POLICY accounts_update ON public.accounts FOR UPDATE TO authenticated USING(private.current_user_role()='admin' OR owner_id=(select auth.uid())) WITH CHECK(private.current_user_role()='admin' OR owner_id=(select auth.uid()));
CREATE POLICY accounts_delete ON public.accounts FOR DELETE TO authenticated USING(private.current_user_role()='admin');

CREATE POLICY contacts_select ON public.contacts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=contacts.account_id AND (private.current_user_role()='admin' OR a.owner_id=(select auth.uid()) OR private.current_user_role() IN ('service','parts','operations'))));
CREATE POLICY contacts_write ON public.contacts FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=contacts.account_id AND (private.current_user_role()='admin' OR a.owner_id=(select auth.uid())))) WITH CHECK(EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=contacts.account_id AND (private.current_user_role()='admin' OR a.owner_id=(select auth.uid()))));
CREATE POLICY sites_select ON public.sites FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=sites.account_id AND (private.current_user_role()='admin' OR a.owner_id=(select auth.uid()) OR private.current_user_role() IN ('service','parts','operations'))));
CREATE POLICY sites_write ON public.sites FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=sites.account_id AND (private.current_user_role()='admin' OR a.owner_id=(select auth.uid())))) WITH CHECK(EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=sites.account_id AND (private.current_user_role()='admin' OR a.owner_id=(select auth.uid()))));
CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated USING((select auth.uid()) IS NOT NULL);
CREATE POLICY assets_write ON public.assets FOR ALL TO authenticated USING(private.current_user_role() IN ('admin','operations','sales')) WITH CHECK(private.current_user_role() IN ('admin','operations','sales'));
CREATE POLICY opportunities_select ON public.opportunities FOR SELECT TO authenticated USING(private.current_user_role()='admin' OR owner_id=(select auth.uid()) OR private.current_user_role() IN ('service','operations'));
CREATE POLICY opportunities_insert ON public.opportunities FOR INSERT TO authenticated WITH CHECK(private.current_user_role() IN ('admin','sales') AND (owner_id=(select auth.uid()) OR private.current_user_role()='admin'));
CREATE POLICY opportunities_update ON public.opportunities FOR UPDATE TO authenticated USING(private.current_user_role()='admin' OR owner_id=(select auth.uid())) WITH CHECK(private.current_user_role()='admin' OR owner_id=(select auth.uid()));
CREATE POLICY opportunities_delete ON public.opportunities FOR DELETE TO authenticated USING(private.current_user_role()='admin');
CREATE POLICY activities_select ON public.activities FOR SELECT TO authenticated USING(created_by=(select auth.uid()) OR (account_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.accounts a WHERE a.id=activities.account_id)) OR (opportunity_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.opportunities o WHERE o.id=activities.opportunity_id)) OR (asset_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.assets x WHERE x.id=activities.asset_id)));
CREATE POLICY activities_insert ON public.activities FOR INSERT TO authenticated WITH CHECK(created_by=(select auth.uid()) OR private.current_user_role()='admin');
CREATE POLICY activities_update ON public.activities FOR UPDATE TO authenticated USING(created_by=(select auth.uid()) OR private.current_user_role()='admin') WITH CHECK(created_by=(select auth.uid()) OR private.current_user_role()='admin');

INSERT INTO public.locations(code,name,type,city,state) VALUES('HQ','Headquarters Yard','yard','Houston','TX'),('DAL','Dallas Branch','branch','Dallas','TX'),('WH1','Central Warehouse','warehouse','Houston','TX');
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.locations,public.accounts,public.contacts,public.sites,public.assets,public.opportunities,public.activities TO authenticated;
REVOKE ALL ON public.locations,public.accounts,public.contacts,public.sites,public.assets,public.opportunities,public.activities FROM anon;
