-- Security hardening migration per ttml-database-rls-security skill
-- Addresses:
-- - Revoke EXECUTE on critical SECURITY DEFINER RPCs (check_and_deduct_allowance, refund_letter_allowance, safe_status_transition, log_audit_event) from anon/authenticated/PUBLIC
--   These should ONLY be callable server-side via service_role (as per skill: "Do NOT grant to `authenticated`")
-- - Set proper search_path = public on these and the app helper functions (is_app_*) to prevent search path hijacking (skill requires for helpers and RPCs)
-- - Make the is_app_* helpers SECURITY DEFINER (to match skill's requirement for is_* role check functions)
-- - Grant EXECUTE on helpers to authenticated (needed for RLS policies)

-- 1. Revoke from public roles
REVOKE EXECUTE ON FUNCTION public.check_and_deduct_allowance(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_letter_allowance(integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.safe_status_transition(integer, public.letter_status, integer, public.actor_type) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;

-- 2. Grant only to service_role (and postgres if needed)
GRANT EXECUTE ON FUNCTION public.check_and_deduct_allowance(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_letter_allowance(integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.safe_status_transition(integer, public.letter_status, integer, public.actor_type) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event() TO service_role;

-- 3. Fix search_path on RPCs and helpers
ALTER FUNCTION public.check_and_deduct_allowance(integer, integer) SET search_path = public;
ALTER FUNCTION public.refund_letter_allowance(integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.safe_status_transition(integer, public.letter_status, integer, public.actor_type) SET search_path = public;
ALTER FUNCTION public.log_audit_event() SET search_path = public;

-- 4. Make helpers SECURITY DEFINER per skill
ALTER FUNCTION public.is_app_admin() SECURITY DEFINER;
ALTER FUNCTION public.is_app_admin() SET search_path = public;
ALTER FUNCTION public.is_app_employee_or_admin() SECURITY DEFINER;
ALTER FUNCTION public.is_app_employee_or_admin() SET search_path = public;
ALTER FUNCTION public.is_app_subscriber() SECURITY DEFINER;
ALTER FUNCTION public.is_app_subscriber() SET search_path = public;

-- 5. Grant helpers to authenticated for policy use
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_employee_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_subscriber() TO authenticated;

COMMENT ON MIGRATION '20260608000000_rls_rpc_security_hardening' IS 'Hardened grants and search_path for RPCs and role helpers per ttml-database-rls-security skill.';