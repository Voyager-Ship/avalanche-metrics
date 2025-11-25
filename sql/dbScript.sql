
CREATE TABLE public."Contract" (
    id integer NOT NULL,
    deployer_address text,
    "timestamp" text,
    address text
);


ALTER TABLE public."Contract" OWNER TO neondb_owner;

--
-- Name: Contract_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public."Contract" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."Contract_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public."ProjectRepository" (
    project_id text NOT NULL,
    repository_id text NOT NULL
);


ALTER TABLE public."ProjectRepository" OWNER TO neondb_owner;

CREATE TABLE public."Repository" (
    id text DEFAULT gen_random_uuid() NOT NULL,
    repo_id text,
    repo_name text,
    user_id text,
    commits integer,
    first_contribution bigint,
    last_contribution bigint
);


ALTER TABLE public."Repository" OWNER TO neondb_owner;

CREATE TABLE public."User" (
    profile_privacy text DEFAULT 'public'::text,
    social_media text[],
    custom_attributes text[],
    telegram_user text,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    github_user_name text,
    address text
);


ALTER TABLE public."User" OWNER TO neondb_owner;
    id text NOT NULL,
    user_id text NOT NULL,
    badge_id text NOT NULL,
    awarded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    awarded_by text,
    evidence jsonb
);

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_address_key" UNIQUE (address);


--
-- Name: Contract Contract_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_pkey" PRIMARY KEY (id);


--
-- Name: Repository Contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Repository"
    ADD CONSTRAINT "Contributions_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ProjectRepository"
    ADD CONSTRAINT "ProjectRepository_pkey" PRIMARY KEY (project_id, repository_id);

ALTER TABLE ONLY public."ProjectRepository"
    ADD CONSTRAINT "ProjectRepository_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectRepository ProjectRepository_repository_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProjectRepository"
    ADD CONSTRAINT "ProjectRepository_repository_id_fkey" FOREIGN KEY (repository_id) REFERENCES public."Repository"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Repository ProjectRepository_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Repository"
    ADD CONSTRAINT "ProjectRepository_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
