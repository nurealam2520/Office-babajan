
-- Add unique constraints on username and mobile_number in profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_mobile_number_unique UNIQUE (mobile_number);
