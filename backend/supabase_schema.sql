-- This trigger automatically creates a user in the public.users table
-- whenever a new user signs up via Supabase Auth.

-- Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, university, created_at, questionnaire_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
    CASE 
      WHEN lower(NEW.email) LIKE '%@concordia.ca'
        OR lower(NEW.email) LIKE '%@live.concordia.ca'
        OR lower(NEW.email) LIKE '%@mail.concordia.ca' THEN 'concordia'
      ELSE 'mcgill'
    END,
    NOW(),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
