import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sessionToken = req.headers.get('x-session-token');

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No session token provided' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate session token using secure database function
    const { data: sessionData, error: sessionError } = await supabase
      .rpc('validate_admin_session', {
        _token: sessionToken
      });

    if (sessionError || !sessionData || sessionData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const session = sessionData[0];

    // Fetch recordings
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });

    if (recordingsError) {
      console.error('Error fetching recordings:', recordingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recordings' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ recordings }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-recordings function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
