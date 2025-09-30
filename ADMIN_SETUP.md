# Admin Role Management Security

## Overview

The admin role system implements defense-in-depth security with:
- **Token Hashing**: Session tokens are hashed (SHA-256) before storage
- **RLS Protection**: All sensitive tables block direct client access
- **Server-Side Validation**: Only edge functions with service role can access protected data
- **Session Expiry**: Tokens automatically expire after 24 hours
- **Audit Logging**: All admin operations are logged with timestamps

## Security Architecture

### Session Token Security

**Before (Vulnerable):**
- Session tokens stored in plaintext
- Overly permissive RLS policies
- Direct client access possible

**After (Secure):**
- Tokens hashed with SHA-256 before database storage
- Client receives unhashed token (stored in sessionStorage)
- Database stores only the hash
- Comparison done server-side via `validate_admin_session()` function
- Even if database is compromised, tokens cannot be used

### Database Functions

1. **create_admin_session(user_id, expires_at)**
   - Generates cryptographically random 32-byte token
   - Hashes token with SHA-256
   - Stores hash in database
   - Returns unhashed token (only time client sees it)

2. **validate_admin_session(token)**
   - Hashes provided token
   - Compares hash against database
   - Returns user_id and expiry if valid
   - Automatically checks expiration

### RLS Policies

All sensitive tables have strict RLS:
- `admin_sessions`: Blocks all direct client access
- `user_roles`: Blocks all direct client access  
- `recordings`: Blocks direct SELECT, allows anonymous insert for uploads
- `whitelist`: Blocks all direct client access

## Initial Setup

### Step 1: Set Admin Setup Secret

Before creating your first admin, ensure you've set the `ADMIN_SETUP_SECRET` in your Lovable Cloud secrets:

1. Go to your project settings
2. Navigate to Secrets
3. Add `ADMIN_SETUP_SECRET` with a strong, random value

### Step 2: Create Initial Admin

Call the `setup-initial-admin` edge function with your setup secret:

```typescript
const { data, error } = await supabase.functions.invoke('setup-initial-admin', {
  body: {
    setupSecret: 'your-admin-setup-secret',
    userId: '00000000-0000-0000-0000-000000000000' // System admin user ID
  }
});
```

**Important**: This function can only be used ONCE to create the first admin. After the initial admin exists, it will reject all requests.

## Managing Roles

Once you have an admin session, use the `manage-roles` edge function:

### Add a Role

```typescript
const { data, error } = await supabase.functions.invoke('manage-roles', {
  headers: {
    'x-session-token': sessionToken
  },
  body: {
    action: 'add',
    userId: 'user-uuid',
    role: 'admin' // or 'user'
  }
});
```

### Remove a Role

```typescript
const { data, error } = await supabase.functions.invoke('manage-roles', {
  headers: {
    'x-session-token': sessionToken
  },
  body: {
    action: 'remove',
    userId: 'user-uuid',
    role: 'admin'
  }
});
```

### List All Roles

```typescript
const { data, error } = await supabase.functions.invoke('manage-roles', {
  headers: {
    'x-session-token': sessionToken
  },
  body: {
    action: 'list'
  }
});
```

## Security Best Practices

1. **Protect Setup Secret**: Never commit `ADMIN_SETUP_SECRET` to version control
2. **Rotate Secrets**: Regularly update `RECORDINGS_PASSWORD` and other secrets
3. **Monitor Access**: Review edge function logs for unauthorized access attempts
4. **Session Expiry**: Tokens expire after 24 hours - users must re-authenticate
5. **Audit Trail**: All role operations logged with user IDs and timestamps
6. **Token Storage**: Tokens are hashed in database - even DB compromise won't expose active sessions
7. **HTTPS Only**: Always use HTTPS in production to prevent token interception

## Threat Mitigation

This architecture protects against:

- **Privilege Escalation**: Users cannot grant themselves admin roles (RLS blocks direct access)
- **Direct Database Access**: Client code cannot query sensitive tables
- **Session Hijacking**: Tokens are hashed, expire automatically, validated server-side
- **Token Theft from Database**: Only hashes stored - stolen hashes are useless
- **Unauthorized Operations**: All admin actions require valid session + admin role verification
- **MITM Attacks**: Session tokens only transmitted over HTTPS in production

## Emergency Access

If you lose admin access:

1. You can manually insert an admin role using the Supabase dashboard SQL editor (requires project owner access)
2. Or use the `ADMIN_SETUP_SECRET` if no admins exist (the system will allow a new admin creation)

```sql
-- Emergency admin creation (use with caution)
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin');
```
