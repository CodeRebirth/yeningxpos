# Support Module Documentation

This module provides support ticket functionality for the restaurant management system.

## Features

1. **Create Support Tickets**
   - Submit detailed support requests with descriptions
   - Attach files (screenshots, logs, etc.)
   - Request tracking

2. **View and Manage Tickets**
   - See all submitted tickets
   - Track status (open, in progress, resolved, closed)
   - View support team responses

3. **FAQ Section**
   - Common questions and answers
   - Self-help resources

## Database Tables

The support module uses the following database tables:

```sql
-- Support Tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Responses table
CREATE TABLE support_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Deployment

To deploy the support tables to your Supabase instance:

1. Make sure your environment variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Run the deployment script:
   ```
   npm run deploy-support-tables
   ```

## Implementation Details

The Support module is implemented with:

1. **Tabs Interface**
   - Create Ticket tab
   - My Tickets tab
   - FAQ tab

2. **Form Component**
   - Subject field
   - Description textarea
   - File attachment

3. **Ticket List**
   - Status indicators
   - View ticket details

4. **Local Storage Fallback**
   - If database tables aren't available, the system falls back to localStorage

## Permissions

- Users can create and view their own tickets
- Admin and managers can view all tickets and respond to them
- All users can access the FAQ section 