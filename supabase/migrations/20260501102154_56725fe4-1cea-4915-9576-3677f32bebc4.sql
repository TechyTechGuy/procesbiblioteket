INSERT INTO public.departments(name) VALUES
('Accounting'),('Bad debt'),('Billing'),('Business Intelligence'),
('Commercial Finance'),('Credit & Fraud'),('Facility'),('Logistics'),
('Repair'),('Security Operations'),('Supply Chain')
ON CONFLICT DO NOTHING;

-- Sikrer unik constraint så vi undgår duplikater fremover
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='departments_name_unique') THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_name_unique UNIQUE (name);
  END IF;
END $$;

-- Opret admin-bruger med bekræftet email hvis ikke findes
DO $$
DECLARE
  _uid uuid;
  _exists boolean;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email)='theis.pedersen@3.dk';
  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'theis.pedersen@3.dk', crypt('GME1337', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Theis Pedersen"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), _uid,
      jsonb_build_object('sub', _uid::text, 'email','theis.pedersen@3.dk','email_verified',true),
      'email', 'theis.pedersen@3.dk', now(), now(), now());
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt('GME1337', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = _uid;
  END IF;

  -- Sørg for profil
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
    INSERT INTO public.profiles(id, full_name, email) VALUES (_uid, 'Theis Pedersen', 'theis.pedersen@3.dk');
  END IF;

  -- Sørg for admin-rolle
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role='admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin');
  END IF;
END $$;