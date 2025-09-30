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

    // Validate session using secure database function
    const { data: sessionData, error: sessionError } = await supabase
      .rpc('validate_admin_session', {
        _token: sessionToken
      });

    if (sessionError || !sessionData || sessionData.length === 0) {
      console.error('Invalid session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get file path from request
    const { filePath } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'File path is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating signed URL for file:', filePath);

    // Create signed URL using service role (bypasses RLS)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('recordings')
      .createSignedUrl(filePath, 60); // 60 seconds expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to create download URL', details: signedUrlError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!signedUrlData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: 'No signed URL generated' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Signed URL created successfully');

    return new Response(
      JSON.stringify({ 
        signedUrl: signedUrlData.signedUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in download-recording function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
