const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployTables() {
    console.log('Deploying support tables to Supabase...');

    try {
        // Check if support_tickets table exists
        const { error: checkError } = await supabase
            .from('support_tickets')
            .select('id')
            .limit(1);

        if (!checkError || !checkError.message.includes('does not exist')) {
            console.log('Support tables already exist');
            return;
        }

        // Create support_tickets table
        const { error: createTicketsError } = await supabase.rpc('create_tables', {
            tables_sql: `
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

        CREATE TABLE support_responses (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id),
          message TEXT NOT NULL,
          attachment_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Policies for support tickets
        ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE support_responses ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own tickets" ON support_tickets
          FOR SELECT
          USING (auth.role() = 'authenticated' AND user_id = auth.uid());

        CREATE POLICY "Users can create support tickets" ON support_tickets
          FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Users can update their own tickets" ON support_tickets
          FOR UPDATE
          USING (auth.role() = 'authenticated' AND user_id = auth.uid());

        -- Policies for support responses
        CREATE POLICY "Users can view responses to their tickets" ON support_responses
          FOR SELECT
          USING (auth.role() = 'authenticated' AND 
                ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));

        CREATE POLICY "Admin and managers can view all responses" ON support_responses
          FOR SELECT
          USING (auth.role() = 'authenticated' AND 
                (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));

        CREATE POLICY "Admin and managers can create responses" ON support_responses
          FOR INSERT
          WITH CHECK (auth.role() = 'authenticated' AND 
                      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager'));
        
        -- Create indexes for better performance
        CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
        CREATE INDEX idx_support_tickets_status ON support_tickets(status);
        CREATE INDEX idx_support_responses_ticket_id ON support_responses(ticket_id);
      `
        });

        if (createTicketsError) {
            throw createTicketsError;
        }

        console.log('Successfully deployed support tables to Supabase');

    } catch (error) {
        console.error('Error deploying support tables:', error);
        process.exit(1);
    }
}

deployTables(); 