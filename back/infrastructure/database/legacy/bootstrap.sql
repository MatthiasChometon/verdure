-- 9.6-compatible schema bootstrap for shared hosting without a modern Postgres
-- (e.g. o2switch's PostgreSQL 9.6). The regular Drizzle migration chain cannot
-- run there: it uses gen_random_uuid() defaults, a GENERATED tsvector column and
-- pg_trgm/unaccent extensions, none of which 9.6 has. Run this ONCE on a fresh
-- database instead of `db:migrate`, and start the app with SEARCH_MODE=simple.
--
-- Regenerate after a schema change:
--   1. migrate a Postgres 17 DB (pnpm db:migrate)
--   2. pg_dump --schema-only --no-owner --no-privileges > schema17.sql
--   3. python legacy/generate.py schema17.sql legacy/bootstrap.sql
-- (strips extensions, generated columns, trigram indexes and uuid defaults;
--  keeps search_vector as a plain, unused tsvector so RETURNING stays valid.)
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10


--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--



--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--



--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: cosine_similarity(real[], real[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cosine_similarity(a real[], b real[]) RETURNS double precision
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT coalesce(sum(x::double precision * y::double precision), 0)
  FROM unnest(a, b) AS t(x, y);
$$;




--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: auth_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_token (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nickname; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nickname (
    id uuid NOT NULL,
    genus text DEFAULT ''::text NOT NULL,
    lang text NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nickname_source; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nickname_source (
    id uuid NOT NULL,
    kind text NOT NULL,
    lang text DEFAULT ''::text NOT NULL,
    value text NOT NULL
);


--
-- Name: plant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plant (
    id uuid NOT NULL,
    name text NOT NULL,
    species text NOT NULL,
    image_key text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    description text,
    embedding real[],
    search_vector tsvector,
    watering_interval_summer_days integer,
    watering_interval_winter_days integer
);


--
-- Name: recognition_job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recognition_job (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    image_key text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    species text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: species; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.species (
    id uuid NOT NULL,
    gbif_key integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id uuid NOT NULL,
    google_id text,
    email text NOT NULL,
    name text NOT NULL,
    avatar_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    password_hash text,
    email_verified_at timestamp without time zone,
    locale text DEFAULT 'fr'::text NOT NULL
);


--
-- Name: watering_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watering_default (
    genus text NOT NULL,
    summer_days integer NOT NULL,
    winter_days integer NOT NULL
);


--
-- Name: watering_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watering_event (
    id uuid NOT NULL,
    plant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    watered_on date NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: worker_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker_token (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    label text,
    last_seen_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: auth_token auth_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_token
    ADD CONSTRAINT auth_token_pkey PRIMARY KEY (id);


--
-- Name: nickname nickname_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nickname
    ADD CONSTRAINT nickname_pkey PRIMARY KEY (id);


--
-- Name: nickname_source nickname_source_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nickname_source
    ADD CONSTRAINT nickname_source_pkey PRIMARY KEY (id);


--
-- Name: nickname_source nickname_source_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nickname_source
    ADD CONSTRAINT nickname_source_unique UNIQUE (kind, lang, value);


--
-- Name: nickname nickname_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nickname
    ADD CONSTRAINT nickname_unique UNIQUE (genus, lang, name);


--
-- Name: plant plant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plant
    ADD CONSTRAINT plant_pkey PRIMARY KEY (id);


--
-- Name: recognition_job recognition_job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_job
    ADD CONSTRAINT recognition_job_pkey PRIMARY KEY (id);


--
-- Name: species species_gbif_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT species_gbif_key_unique UNIQUE (gbif_key);


--
-- Name: species species_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT species_name_unique UNIQUE (name);


--
-- Name: species species_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT species_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_google_id_unique UNIQUE (google_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: watering_default watering_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watering_default
    ADD CONSTRAINT watering_default_pkey PRIMARY KEY (genus);


--
-- Name: watering_event watering_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watering_event
    ADD CONSTRAINT watering_event_pkey PRIMARY KEY (id);


--
-- Name: worker_token worker_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker_token
    ADD CONSTRAINT worker_token_pkey PRIMARY KEY (id);


--
-- Name: nickname_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nickname_lookup_idx ON public.nickname USING btree (genus, lang);


--
-- Name: plant_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: plant_search_vector_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: plant_species_trgm_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: recognition_job_claim_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recognition_job_claim_idx ON public.recognition_job USING btree (status, created_at);


--
-- Name: species_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: watering_event_plant_day_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX watering_event_plant_day_unique ON public.watering_event USING btree (plant_id, watered_on);


--
-- Name: worker_token_hash_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX worker_token_hash_unique ON public.worker_token USING btree (token_hash);


--
-- Name: watering_event watering_event_plant_id_plant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watering_event
    ADD CONSTRAINT watering_event_plant_id_plant_id_fk FOREIGN KEY (plant_id) REFERENCES public.plant(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


