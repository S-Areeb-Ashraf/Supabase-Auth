-- 1. Create a table linked to Supabase's internal auth.users table
create table public.secret_notes (
    id bigint generated always as identity primary key,
    user_id uuid references auth.users(id) not null default auth.uid(),
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Turn on Row Level Security (RLS)
alter table public.secret_notes enable row level security;

-- 3. Policy: Allow users to view ONLY their own notes
create policy "Users can read their own notes" 
on public.secret_notes for select 
using ( (select auth.uid()) = user_id );

-- 4. Policy: Allow users to insert notes ONLY for themselves
create policy "Users can insert their own notes" 
on public.secret_notes for insert 
with check ( (select auth.uid()) = user_id );