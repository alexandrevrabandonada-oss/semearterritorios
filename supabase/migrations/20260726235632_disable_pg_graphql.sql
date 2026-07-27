-- A aplicação usa a API REST do Supabase e não possui clientes GraphQL.
-- Remove a superfície GraphQL e a descoberta de esquema associada.

drop extension if exists pg_graphql;
