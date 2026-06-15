alter table ratings add column if not exists rating_deviation float not null default 200;
alter table ratings add column if not exists elo_volatility float not null default 0;
