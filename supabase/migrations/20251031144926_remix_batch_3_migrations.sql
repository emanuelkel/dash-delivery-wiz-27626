
-- Migration: 20251031142539

-- Migration: 20251030201847

-- Migration: 20251030195339

-- Migration: 20251030193633

-- Migration: 20251030191937
-- Create enum for order status
CREATE TYPE status_pedido AS ENUM ('aguardando', 'concluído', 'cancelado');

-- Create the orders table
CREATE TABLE public.superpopular_pedidos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  data_pedido TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome TEXT NOT NULL,
  telefone VARCHAR(20),
  produto TEXT NOT NULL,
  valor_do_produto NUMERIC(10, 2) NOT NULL DEFAULT 0,
  forma_de_pagamento TEXT NOT NULL,
  pagamento TEXT,
  troco NUMERIC(10, 2) DEFAULT 0,
  endereco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status status_pedido DEFAULT 'aguardando',
  data_entrega TIMESTAMPTZ,
  entregador TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.superpopular_pedidos ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.superpopular_pedidos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users can insert their own orders"
ON public.superpopular_pedidos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders
CREATE POLICY "Users can update their own orders"
ON public.superpopular_pedidos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own orders
CREATE POLICY "Users can delete their own orders"
ON public.superpopular_pedidos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_superpopular_pedidos_user_id ON public.superpopular_pedidos(user_id);
CREATE INDEX idx_superpopular_pedidos_data_pedido ON public.superpopular_pedidos(data_pedido DESC);
CREATE INDEX idx_superpopular_pedidos_status ON public.superpopular_pedidos(status);
CREATE INDEX idx_superpopular_pedidos_entregador ON public.superpopular_pedidos(entregador);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insert some sample data for testing
INSERT INTO public.superpopular_pedidos (nome, telefone, produto, valor_do_produto, forma_de_pagamento, endereco, status, entregador, user_id)
SELECT 
  'Cliente Exemplo',
  '+5511999999999',
  'Produto de teste',
  50.00,
  'Dinheiro',
  'Rua Exemplo, 123',
  'concluído',
  'João',
  auth.uid()
WHERE auth.uid() IS NOT NULL;



-- Migration: 20251030194830
-- Create profiles table to store establishment information
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  nome_estabelecimento text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  primary key (id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies for profiles table
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome_estabelecimento)
  values (new.id, new.raw_user_meta_data ->> 'nome_estabelecimento');
  return new;
end;
$$;

-- Create trigger to automatically create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute procedure public.handle_updated_at();


-- Migration: 20251030195436
-- Fix security warning: Add search_path to handle_updated_at function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Migration: 20251030195908
-- Add icon_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN icon_name TEXT DEFAULT 'package';


-- Migration: 20251030202020
-- Remover coluna pagamento e tornar user_id opcional com valor padrão
ALTER TABLE public.superpopular_pedidos 
DROP COLUMN IF EXISTS pagamento;

-- Tornar user_id nullable e adicionar valor padrão como primeira pessoa autenticada
ALTER TABLE public.superpopular_pedidos 
ALTER COLUMN user_id DROP NOT NULL;

-- Atualizar as políticas RLS para permitir que usuários autenticados vejam todos os pedidos
DROP POLICY IF EXISTS "Users can view their own orders" ON public.superpopular_pedidos;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.superpopular_pedidos;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.superpopular_pedidos;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.superpopular_pedidos;

-- Criar políticas mais flexíveis para usuários autenticados
CREATE POLICY "Authenticated users can view all orders"
ON public.superpopular_pedidos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert orders"
ON public.superpopular_pedidos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
ON public.superpopular_pedidos
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete orders"
ON public.superpopular_pedidos
FOR DELETE
TO authenticated
USING (true);

-- Migration: 20251030202919
-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função para verificar role (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas RLS para user_roles (apenas admins podem gerenciar)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar coluna logo_url na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN logo_url TEXT;

-- Atualizar políticas RLS da tabela profiles para permitir admins gerenciarem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Criar bucket de storage para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Políticas de storage para logos (leitura pública, escrita apenas admin)
CREATE POLICY "Logos são publicamente acessíveis"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Admins podem fazer upload de logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));


-- Migration: 20251031144521
-- Fix critical security issue: Overly permissive RLS policies on superpopular_pedidos table

-- First, ensure user_id column is not nullable and has proper foreign key
-- Update any existing NULL user_ids to a default (should not exist in production)
-- This is safe because new orders should always have user_id set
ALTER TABLE public.superpopular_pedidos 
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE public.superpopular_pedidos
ADD CONSTRAINT fk_superpopular_pedidos_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view all orders" ON public.superpopular_pedidos;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.superpopular_pedidos;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.superpopular_pedidos;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.superpopular_pedidos;

-- Create secure, owner-scoped policies
CREATE POLICY "Users can view own orders or admins view all" 
ON public.superpopular_pedidos
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update own orders or admins update all" 
ON public.superpopular_pedidos
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Only admins can delete orders" 
ON public.superpopular_pedidos
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can create own orders" 
ON public.superpopular_pedidos
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

-- Migration: 20251031144700
-- Add RLS policies for the logos storage bucket to allow admins to upload logos

-- Allow admins to insert/upload logos
CREATE POLICY "Admins can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated users to view logos
CREATE POLICY "Authenticated users can view logos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
);

-- Allow admins to update logos
CREATE POLICY "Admins can update logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete logos
CREATE POLICY "Admins can delete logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);
