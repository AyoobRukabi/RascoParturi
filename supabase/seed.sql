-- Seed data: ONLY facts verified from the existing website (screenshots supplied by the owner).
-- Nothing here enables booking. Durations are NULL until the owner confirms them, so every
-- service starts with bookable_online = false.

insert into public.opening_hours (weekday, open_time, close_time) values
  (1, '10:00', '19:00'), (2, '10:00', '19:00'), (3, '10:00', '19:00'),
  (4, '10:00', '19:00'), (5, '10:00', '19:00'), (6, '10:00', '19:00'),
  (0, '12:00', '18:00')
on conflict (weekday) do nothing;

insert into public.services (slug, name_fi, name_en, price_cents, sort_order) values
  ('parturileikkaus',            'Parturileikkaus',                 'Barber haircut',               1500, 10),
  ('koneajo',                    'Koneajo',                         'Clipper cut',                  1500, 20),
  ('lasten-hiustenleikkaus',     'Lasten hiustenleikkaus',          'Children''s haircut',          1500, 30),
  ('kampaamoleikkaus',           'Kampaamoleikkaus',                'Hairdresser cut',              3000, 40),
  ('parturileikkaus-elakelaiset','Parturileikkaus - eläkeläiset',   'Barber haircut - pensioners',  1500, 50),
  ('parran-muotoilu',            'Parran muotoilu',                 'Beard shaping',                1500, 60),
  ('parran-siistiminen',         'Parran siistiminen / koneajo',    'Beard trim / clipper',         1500, 70)
on conflict (slug) do nothing;
-- NOTE: the old site's service list continued beyond these seven (the screenshots end at "...").
-- Add the remaining services in the admin dashboard once confirmed.
