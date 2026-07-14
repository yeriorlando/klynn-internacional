CREATE OR REPLACE FUNCTION public.admin_set_user_email(target_user_id UUID, new_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET email = new_email,
      email_confirmed_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
