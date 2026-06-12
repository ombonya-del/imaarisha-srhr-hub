-- Admin handover: ombonya@gmail.com → imaarishasrhr@gmail.com
-- PREREQUISITE: imaarishasrhr@gmail.com must have an account first!
-- (Sign up once in the hub with that email, then run this.)

update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'imaarishasrhr@gmail.com');
-- ^ must say "1 row updated". If 0: the account doesn't exist yet — sign up first.

-- Optional: revoke admin from the personal account (keep both if you prefer)
-- update public.profiles set is_admin = false
-- where id = (select id from auth.users where email = 'ombonya@gmail.com');

-- Verify:
select u.email, p.is_admin from auth.users u
join public.profiles p on p.id = u.id
where p.is_admin = true;
