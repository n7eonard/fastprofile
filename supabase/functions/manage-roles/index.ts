import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sessionToken = req.headers.get('x-session-token');

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No session token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate session and get user_id
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (new Date(session.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user has admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user_id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      console.error(`User ${session.user_id} attempted admin action without admin role`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { action, userId, role } = await req.json();

    if (!action || !userId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, userId, role' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let result;

    switch (action) {
      case 'add':
        const { error: addError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        
        if (addError) {
          console.error('Error adding role:', addError);
          return new Response(
            JSON.stringify({ error: 'Failed to add role' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        result = { success: true, message: 'Role added successfully' };
        console.log(`Admin ${session.user_id} added role ${role} to user ${userId}`);
        break;

      case 'remove':
        const { error: removeError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        
        if (removeError) {
          console.error('Error removing role:', removeError);
          return new Response(
            JSON.stringify({ error: 'Failed to remove role' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        result = { success: true, message: 'Role removed successfully' };
        console.log(`Admin ${session.user_id} removed role ${role} from user ${userId}`);
        break;

      case 'list':
        const { data: roles, error: listError } = await supabase
          .from('user_roles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (listError) {
          console.error('Error listing roles:', listError);
          return new Response(
            JSON.stringify({ error: 'Failed to list roles' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        result = { success: true, roles };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: add, remove, or list' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in manage-roles function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
