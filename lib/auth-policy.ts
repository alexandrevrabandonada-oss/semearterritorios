export function hasAuthorizedRole(role: unknown): boolean {
  return typeof role === "string" && ["admin", "coordenacao", "equipe"].includes(role);
}

export function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return "/";
  }
  return value;
}
