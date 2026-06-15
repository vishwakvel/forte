alter table songs add column if not exists genres text[] default '{}';
alter table songs add column if not exists primary_genre text;
