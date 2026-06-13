-- ════════════════════════════════════════════════════════════════════════════
-- HEBU FIKA — let admins read pending reviews for moderation
-- The public read policy only exposes status = 'published'; this adds a second
-- permissive SELECT policy so admins (is_admin) can see pending/hidden too.
-- Depends on public.is_admin().
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists fika_reviews_admin_read on public.fika_reviews;
create policy fika_reviews_admin_read on public.fika_reviews for select using (public.is_admin());
