drop policy if exists actions_delete_safe
on public.actions;

create policy actions_delete_safe
on public.actions for delete to authenticated
using (
  (
    public.get_user_role() in ('admin', 'coordenacao')
    or (public.get_user_role() = 'equipe' and created_by = auth.uid())
  )
  and not exists (
    select 1
    from public.listening_records lr
    where lr.action_id = actions.id
  )
);
