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
    return (
      <section className="rounded-3xl border border-white/60 bg-white/85 backdrop-blur-md p-8 shadow-premium-md text-sm font-medium text-stone-600">
        Carregando equipe...
      </section>
    );
  }

  return (
    <section className="pb-10">
      <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-6 shadow-premium-md sm:p-8 hover:shadow-premium-lg transition-all duration-200">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Equipe operacional</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-semear-green">Membros da equipe</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600">
          Cadastro operacional. Não concede acesso ao sistema. Permissões continuam sendo controladas por profiles e RLS.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-5 shadow-premium-md hover:shadow-premium-lg transition-all duration-200">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-semear-green">Lista da equipe</h3>
            <div className="flex gap-1.5">
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
                  className={`rounded-2xl border p-4 shadow-premium-sm transition-all duration-200 ${
                    isEditing
                      ? "border-semear-green bg-semear-green-soft/40 ring-1 ring-semear-green/10"
                      : "border-white/40 bg-white/60 hover:bg-white/85"
                  }`}
                  key={member.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-semear-green">{member.display_name}</p>
                      <p className="mt-1 text-xs text-stone-600 font-medium">
                        {member.role_label || "Sem função informada"}
                        {member.email ? ` · ${member.email}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-stone-500 font-medium">
                        {member.active ? "Ativo" : "Inativo"} · {member.can_interview ? "Pode entrevistar" : "Não entrevista"} · {member.can_join_actions ? "Participa de ações" : "Não participa de ações"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${member.profile_id ? "bg-green-50 text-green-700 border-green-200/50" : "bg-amber-50 text-amber-800 border-amber-200/50"}`}>
                          {member.profile_id ? "com login vinculado" : "sem login vinculado"}
                        </span>
                      </div>
                    </div>
                    {canManage ? (
                      <button
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white px-4 text-xs font-bold text-semear-green shadow-premium-sm hover:shadow-premium-md hover:bg-stone-50 active:scale-[0.98] transition-all duration-200"
                        onClick={() => fillForm(member)}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Editar
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {filteredMembers.length === 0 ? <p className="text-sm text-stone-500 font-medium py-4 text-center">Nenhum membro para o filtro atual.</p> : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-5 h-fit">
          <form ref={formRef} className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-5 shadow-premium-md hover:shadow-premium-lg transition-all duration-200" onSubmit={handleSave}>
            <div className="flex items-center gap-2 text-semear-green">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
              <h3 className="font-extrabold">{editingId ? "Editar membro" : "Novo membro"}</h3>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-semear-green">Nome exibido</span>
              <input className="mt-2 min-h-11 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" value={formValues.display_name} onChange={(e) => updateField("display_name", e.target.value)} required />
            </label>

            <label className="mt-3 block">
              <span className="text-sm font-bold text-semear-green">E-mail (opcional)</span>
              <input className="mt-2 min-h-11 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" value={formValues.email} onChange={(e) => updateField("email", e.target.value)} />
            </label>

            <label className="mt-3 block">
              <span className="text-sm font-bold text-semear-green">Função no projeto</span>
              <input className="mt-2 min-h-11 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" value={formValues.role_label} onChange={(e) => updateField("role_label", e.target.value)} placeholder="Ex.: articulação territorial, facilitação" />
            </label>

            <label className="mt-3 block">
              <span className="text-sm font-bold text-semear-green">Vincular profile (opcional)</span>
              <select className="mt-2 min-h-11 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" value={formValues.profile_id} onChange={(e) => updateField("profile_id", e.target.value)}>
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
              <span className="text-sm font-bold text-semear-green">Observações internas</span>
              <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-sm leading-relaxed font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green" value={formValues.notes} onChange={(e) => updateField("notes", e.target.value)} />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-semear-green px-5 text-sm font-bold text-white shadow-premium-sm hover:bg-semear-green/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60" type="submit" disabled={saving || !canManage}>
                {editingId ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar membro"}
              </button>
              {editingId ? (
                <button className="inline-flex min-h-11 items-center rounded-full border border-white/60 bg-white px-5 text-sm font-bold text-semear-green shadow-premium-sm hover:bg-stone-50 active:scale-[0.98] transition-all duration-200" type="button" onClick={resetForm}>
                  Cancelar
                </button>
              ) : null}
            </div>

            {!canManage ? <p className="mt-3 text-xs text-stone-500 font-bold">Somente coordenação/admin podem alterar cadastro.</p> : null}
            {feedback ? <p className="mt-3 text-sm font-bold text-semear-green">{feedback}</p> : null}
            {error ? <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}

            <div className="mt-4 rounded-2xl border border-semear-green/20 bg-semear-green-soft/40 p-3 text-xs leading-5 text-stone-600 font-bold shadow-premium-sm">
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
    <label className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5 text-sm text-stone-750 font-bold shadow-premium-sm cursor-pointer hover:bg-white/80 active:scale-[0.99] transition-all duration-200">
      <input type="checkbox" className="h-4 w-4 rounded border-stone-300 text-semear-green focus:ring-semear-green" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
      {checked ? <CheckCircle2 className="ml-auto h-4 w-4 text-green-600" aria-hidden="true" /> : null}
    </label>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 ${
        active 
          ? "bg-semear-green text-white shadow-premium-sm" 
          : "border border-white/60 bg-white/80 text-semear-green shadow-premium-sm hover:shadow-premium-md hover:bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
