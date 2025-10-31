import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar se o usuário que está fazendo a requisição é admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Não autorizado')
    }

    // Verificar se é admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      throw new Error('Acesso negado. Apenas administradores podem criar usuários.')
    }

    const { email, password, nome_estabelecimento, role, logo_file, logo_filename } = await req.json()

    // Criar usuário usando Admin API
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome_estabelecimento
      }
    })

    if (createError) {
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Erro ao criar usuário')
    }

    let logoUrl = null

    // Fazer upload da logo se houver
    if (logo_file && logo_filename) {
      const logoBuffer = Uint8Array.from(atob(logo_file), c => c.charCodeAt(0))
      
      const { error: uploadError } = await supabaseClient.storage
        .from('logos')
        .upload(logo_filename, logoBuffer, {
          contentType: 'image/*',
          upsert: false
        })

      if (uploadError) {
        console.error('Erro ao fazer upload da logo:', uploadError)
      } else {
        const { data: { publicUrl } } = supabaseClient.storage
          .from('logos')
          .getPublicUrl(logo_filename)

        logoUrl = publicUrl

        // Atualizar perfil com logo
        await supabaseClient
          .from('profiles')
          .update({ logo_url: logoUrl })
          .eq('id', newUser.user.id)
      }
    }

    // Adicionar role ao usuário
    const { error: roleInsertError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role
      })

    if (roleInsertError) {
      throw roleInsertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          logo_url: logoUrl
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erro:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
