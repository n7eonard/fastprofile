# Admin Role Management Security

## Overview

The admin role system has been secured to prevent privilege escalation attacks. The `user_roles` table is now protected with strict RLS policies that block all direct client access.

## Security Architecture

1. **RLS Protection**: The `user_roles` table blocks ALL direct client access
2. **Server-Side Only**: Only edge functions with service role access can manage roles
3. **Session Validation**: All admin operations require a valid session token
4. **Admin Authorization**: Role management operations verify admin privileges before execution

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
2. **Rotate Secrets**: Regularly update the `RECORDINGS_PASSWORD` and other sensitive secrets
3. **Monitor Access**: Review edge function logs for unauthorized access attempts
4. **Session Expiry**: Admin sessions expire after 24 hours for security
5. **Audit Trail**: All role management operations are logged with timestamps and user IDs

## Threat Mitigation

This architecture protects against:

- **Privilege Escalation**: Users cannot grant themselves admin roles
- **Direct Database Access**: Client-side code cannot modify the `user_roles` table
- **Session Hijacking**: Tokens expire and are validated server-side
- **Unauthorized Operations**: All admin actions require valid session + admin role verification

## Emergency Access

If you lose admin access:

1. You can manually insert an admin role using the Supabase dashboard SQL editor (requires project owner access)
2. Or use the `ADMIN_SETUP_SECRET` if no admins exist (the system will allow a new admin creation)

```sql
-- Emergency admin creation (use with caution)
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin');
```
