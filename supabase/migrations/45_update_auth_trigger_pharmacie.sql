-- Migration 45 : Mise à jour du trigger d'inscription D-PHARMA
-- 1. Utilise 'pharmacie' et 'fournisseur' comme formules principales (suppression du standard-medium-premium)
-- 2. Remplace 'GIE Sans Nom' par 'Pharmacie'

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_pharma_nom text;
  v_pharma_id uuid;
  v_plan text;
  v_existing_gie_id uuid;
  v_role text;
  v_devise text;
begin
  v_existing_gie_id := (new.raw_user_meta_data->>'existing_gie_id')::uuid;

  if v_existing_gie_id is not null then
    v_role := coalesce(new.raw_user_meta_data->>'role', 'employe');
    insert into public.utilisateurs (id, gie_id, role)
    values (new.id, v_existing_gie_id, v_role);
    return new;
  end if;

  v_pharma_nom := coalesce(new.raw_user_meta_data->>'gie_nom', new.raw_user_meta_data->>'pharmacie_nom', 'Ma Pharmacie');

  v_plan := coalesce(new.raw_user_meta_data->>'plan', 'pharmacie');
  if v_plan not in ('pharmacie', 'fournisseur', 'standard', 'medium', 'premium') then
    v_plan := 'pharmacie';
  end if;

  v_devise := coalesce(new.raw_user_meta_data->>'devise', 'XOF');
  if v_devise not in ('XOF', 'XAF', 'MRU', 'MAD', 'GNF', 'EUR', 'USD', 'AUCUNE') then
    v_devise := 'XOF';
  end if;

  insert into public.gies (nom, abonnement_statut, subscription_tier, essai_expire_le, devise, pays, pays_nom)
  values (
    v_pharma_nom, 'actif', v_plan, now() + interval '7 days', v_devise,
    left(new.raw_user_meta_data->>'pays', 10), left(new.raw_user_meta_data->>'pays_nom', 100)
  )
  returning id into v_pharma_id;

  insert into public.utilisateurs (id, gie_id, role)
  values (new.id, v_pharma_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;
