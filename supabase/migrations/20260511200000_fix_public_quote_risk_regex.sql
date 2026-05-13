create or replace function public.public_quote_has_critical_risk(p_text text)
returns boolean
language sql
immutable
as $$
  select (
    coalesce(p_text, '') ~ E'\\m[0-9]{3}[-.[:space:]]?[0-9]{3}[-.[:space:]]?[0-9]{3}[-.[:space:]]?[0-9]{2}\\M'
    or coalesce(p_text, '') ~ E'\\m(\\+?55[[:space:]]?)?(\\(?[0-9]{2}\\)?[[:space:]]?)?[0-9]{4,5}[-.[:space:]]?[0-9]{4}\\M'
    or coalesce(p_text, '') ~* E'\\m[[:alnum:]_.%+-]+@[[:alnum:].-]+\\.[a-z]{2,}\\M'
    or coalesce(p_text, '') ~ E'\\m[0-9]{5}[-[:space:]]?[0-9]{3}\\M'
    or coalesce(p_text, '') ~* E'\\m(rua|avenida|av\\.?|travessa|alameda|beco|estrada|rodovia)[[:space:]]+[^,.;\\n]{2,}(,|[[:space:]]+n[ºo]?[[:space:]]*|[[:space:]]+numero[[:space:]]+)[0-9]+'
    or coalesce(p_text, '') ~* E'\\m(moro|minha casa|minha residencia|minha residência|minha moradia)\\M[^.\\n]{0,80}(rua|avenida|av\\.?|travessa|alameda|numero|n[ºo]?|cep)'
  );
$$;
