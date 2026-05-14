"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Profile, TeamMember } from "@/lib/database.types";
import { CheckCircle2, Pencil, Plus, UsersRound } from "lucide-react";

type TeamMemberFormValues = {
  display_name: string;
  email: string;
  role_label: string;
  active: boolean;
  can_interview: boolean;
  can_join_actions: boolean;
  profile_id: string;
  notes: string;
};

const defaultFormValues: TeamMemberFormValues = {
  display_name: "",
  email: "",
  role_label: "",
  active: true,
  can_interview: true,
  can_join_actions: true,
  profile_id: "",
  notes: ""
};

export function TeamMembersPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<Pick<Profile, "id" | "full_name" | "role">[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Pick<Profile, "id" | "role"> | null>(null);
  const [filter, setFilter] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [formValues, setFormValues] = useState<TeamMemberFormValues>(defaultFormValues);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canManage = currentProfile?.role === "admin" || currentProfile?.role === "coordenacao";

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!supabase) {
        setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para gerenciar equipe.");
        setLoading(false);
        return;
      }

      const userResult = await supabase.auth.getUser();
      const userId = userResult.data.user?.id;

      const [membersResult, profilesResult, currentProfileResult] = await Promise.all([
        supabase.from("team_members").select("*").order("display_name", { ascending: true }),
        supabase.from("profiles").select("id, full_name, role").order("full_name", { ascending: true }),
        userId ? supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ignore) return;

      if (membersResult.error || profilesResult.error || currentProfileResult.error) {
        setError(membersResult.error?.message ?? profilesResult.error?.message ?? currentProfileResult.error?.message ?? "Erro ao carregar equipe.");
        setLoading(false);
        return;
      }

      setMembers((membersResult.data ?? []) as TeamMember[]);
      setProfiles((profilesResult.data ?? []) as Pick<Profile, "id" | "full_name" | "role">[]);
      setCurrentProfile((currentProfileResult.data ?? null) as Pick<Profile, "id" | "role"> | null);
      setLoading(false);
    }

    void loadData();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  const filteredMembers = members.filter((member) => {
    if (filter === "ativos") return member.active;
    if (filter === "inativos") return !member.active;
    return true;
  });

  function resetForm() {
    setEditingId(null);
    setFormValues(defaultFormValues);
  }

  function fillForm(member: TeamMember) {
    setError(null);
    setFeedback(null);
    setEditingId(member.id);
    setFormValues({
      display_name: member.display_name,
      email: member.email ?? "",
      role_label: member.role_label ?? "",
      active: member.active,
      can_interview: member.can_interview,
      can_join_actions: member.can_join_actions,
      profile_id: member.profile_id ?? "",
      notes: member.notes ?? ""
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateField<TField extends keyof TeamMemberFormValues>(field: TField, value: TeamMemberFormValues[TField]) {
    setFormValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!canManage) {
      setError("Apenas coordenação ou admin podem cadastrar/editar equipe.");
      return;
    }

    if (!formValues.display_name.trim()) {
      setError("Informe o nome exibido.");
      return;
    }

    const userResult = await supabase?.auth.getUser();
    const userId = userResult?.data.user?.id;
    if (!userId) {
      setError("Entre no sistema antes de salvar equipe.");
      return;
    }

    setSaving(true);

    const basePayload = {
      display_name: formValues.display_name.trim(),
      email: formValues.email.trim() || null,
      role_label: formValues.role_label.trim() || null,
      active: formValues.active,
      can_interview: formValues.can_interview,
      can_join_actions: formValues.can_join_actions,
      profile_id: formValues.profile_id || null,
      notes: formValues.notes.trim() || null
    };

    const result = editingId
      ? await supabase?.from("team_members").update(basePayload).eq("id", editingId).select("*").single()
      : await supabase?.from("team_members").insert({ ...basePayload, created_by: userId }).select("*").single();

    setSaving(false);

    if (result?.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (!result?.data) {
      setError("Erro ao salvar dados: resposta vazia do servidor.");
      setSaving(false);


      return;
    }

    const saved = result?.data as TeamMember;
    setMembers((current) => {
      if (editingId) return current.map((item) => (item.id === editingId ? saved : item)).sort((a, b) => a.display_name.localeCompare(b.display_name, "pt-BR"));
      return [...current, saved].sort((a, b) => a.display_name.localeCompare(b.display_name, "pt-BR"));
    });

    setFeedback(editingId ? "Membro atualizado." : "Membro cadastrado.");
    resetForm();
  }

  if (loading) {
    return <section className="rounded-[2rem] border border-white/80 bg-white/72 p-8 shadow-soft text-sm text-stone-600">Carregando equipe...</section>;
  }

  return (
    <section className="pb-10">
      <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-semear-earth">Equipe operacional</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-semear-green">Membros da equipe</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
          Cadastro operacional. Não concede acesso ao sistema. Permissões continuam sendo controladas por profiles e RLS.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-semear-green">Lista da equipe</h3>
            <div className="flex gap-2">
              <FilterButton active={filter === "ativos"} onClick={() => setFilter("ativos")} label="Ativos" />
              <FilterButton active={filter === "inativos"} onClick={() => setFilter("inativos")} label="Inativos" />
              <FilterButton active={filter === "todos"} onClick={() => setFilter("todos")} label="Todos" />
            </div>
          </div>

          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const isEditing = editingId === member.id;
              return (
                <article
                  className={`rounded-2xl border p-4 transition-all ${
                    isEditing
                      ? "border-semear-green bg-semear-green-soft/30 shadow-md ring-1 ring-semear-green/20"
                      : "border-semear-gray bg-semear-offwhite"
                  }`}
                  key={member.id}
                >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-semear-green">{member.display_name}</p>
                    <p className="mt-1 text-xs text-stone-600">
                      {member.role_label || "Sem função informada"}
                      {member.email ? ` · ${member.email}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      {member.active ? "Ativo" : "Inativo"} · {member.can_interview ? "Pode entrevistar" : "Não entrevista"} · {member.can_join_actions ? "Participa de ações" : "Não participa de ações"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${member.profile_id ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                        {member.profile_id ? "com login vinculado" : "sem login vinculado"}
                      </span>
                    </div>
                  </div>
                  {canManage ? (
                    <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-semear-green/15 bg-white px-3 text-xs font-semibold text-semear-green" onClick={() => fillForm(member)} type="button">
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Editar
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
            {filteredMembers.length === 0 ? <p className="text-sm text-stone-500">Nenhum membro para o filtro atual.</p> : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-5 h-fit">
          <form ref={formRef} className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft" onSubmit={handleSave}>
          <div className="flex items-center gap-2 text-semear-green">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
            <h3 className="font-semibold">{editingId ? "Editar membro" : "Novo membro"}</h3>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-semear-green">Nome exibido</span>
            <input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={formValues.display_name} onChange={(e) => updateField("display_name", e.target.value)} required />
          </label>

          <label className="mt-3 block">
            <span className="text-sm font-semibold text-semear-green">E-mail (opcional)</span>
            <input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={formValues.email} onChange={(e) => updateField("email", e.target.value)} />
          </label>

          <label className="mt-3 block">
            <span className="text-sm font-semibold text-semear-green">Função no projeto</span>
            <input className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={formValues.role_label} onChange={(e) => updateField("role_label", e.target.value)} placeholder="Ex.: articulação territorial, facilitação" />
          </label>

          <label className="mt-3 block">
            <span className="text-sm font-semibold text-semear-green">Vincular profile (opcional)</span>
            <select className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-3 text-sm outline-none focus:border-semear-green" value={formValues.profile_id} onChange={(e) => updateField("profile_id", e.target.value)}>
              <option value="">Sem vínculo</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.full_name ?? profile.id} {profile.role ? `(${profile.role})` : ""}</option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid gap-2">
            <CheckField label="Ativo" checked={formValues.active} onChange={(value) => updateField("active", value)} />
            <CheckField label="Pode entrevistar" checked={formValues.can_interview} onChange={(value) => updateField("can_interview", value)} />
            <CheckField label="Pode participar de ações" checked={formValues.can_join_actions} onChange={(value) => updateField("can_join_actions", value)} />
          </div>

          <label className="mt-3 block">
            <span className="text-sm font-semibold text-semear-green">Observações internas</span>
            <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-semear-gray bg-white px-3 py-2 text-sm outline-none focus:border-semear-green" value={formValues.notes} onChange={(e) => updateField("notes", e.target.value)} />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={saving || !canManage}>
              {editingId ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar membro"}
            </button>
            {editingId ? (
              <button className="inline-flex min-h-11 items-center rounded-full border border-semear-green/15 bg-white px-4 text-sm font-semibold text-semear-green" type="button" onClick={resetForm}>
                Cancelar edição
              </button>
            ) : null}
          </div>

          {!canManage ? <p className="mt-3 text-xs text-stone-500">Somente coordenação/admin podem alterar cadastro.</p> : null}
          {feedback ? <p className="mt-3 text-sm font-semibold text-semear-green">{feedback}</p> : null}
          {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

          <div className="mt-4 rounded-xl border border-semear-green/20 bg-semear-green-soft/40 p-3 text-xs leading-5 text-stone-600">
            Este cadastro é interno e operacional. Estar em team_members não concede acesso ao sistema.
          </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-semear-gray bg-semear-offwhite px-3 py-2 text-sm text-stone-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
      {checked ? <CheckCircle2 className="ml-auto h-4 w-4 text-green-600" aria-hidden="true" /> : null}
    </label>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-semear-green text-white" : "border border-semear-green/15 bg-white text-semear-green"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
