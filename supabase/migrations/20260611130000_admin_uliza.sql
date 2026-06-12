-- Admin powers for Uliza Q&A: admins can see pending questions and publish answers.
-- (Public can only read answered ones; anyone can ask. These add the admin lane.)

drop policy if exists uliza_admin_read   on public.uliza_questions;
drop policy if exists uliza_admin_update on public.uliza_questions;

create policy uliza_admin_read on public.uliza_questions
  for select using (public.is_admin());

create policy uliza_admin_update on public.uliza_questions
  for update using (public.is_admin());
