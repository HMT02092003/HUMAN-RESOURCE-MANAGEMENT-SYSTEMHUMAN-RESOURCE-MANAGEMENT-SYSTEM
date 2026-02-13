--
-- PostgreSQL database dump
--

\restrict 2o6xygKxtjaNddCbnlqqeq4TQhkmJh5EHaCHlc8QlM61Lhh3WiwLee8Upa0Yf9B

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chevrons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chevrons (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "chevronCoefficient" numeric(10,2),
    role_ids integer[]
);


ALTER TABLE public.chevrons OWNER TO postgres;

--
-- Name: chevrons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chevrons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chevrons_id_seq OWNER TO postgres;

--
-- Name: chevrons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chevrons_id_seq OWNED BY public.chevrons.id;


--
-- Name: contract_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    type integer,
    insurance integer,
    description character varying(255),
    "contractTerm" integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.contract_types OWNER TO postgres;

--
-- Name: contract_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contract_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contract_types_id_seq OWNER TO postgres;

--
-- Name: contract_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contract_types_id_seq OWNED BY public.contract_types.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    "contractTypeId" integer,
    "userId" integer,
    "startDate" date,
    "endDate" date,
    "activeDay" date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contracts_id_seq OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(20) NOT NULL,
    description character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role_ids integer[]
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: migrations_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.migrations_lock OWNER TO postgres;

--
-- Name: migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_lock_index_seq OWNER TO postgres;

--
-- Name: migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_lock_index_seq OWNED BY public.migrations_lock.index;


--
-- Name: chevrons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chevrons ALTER COLUMN id SET DEFAULT nextval('public.chevrons_id_seq'::regclass);


--
-- Name: contract_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_types ALTER COLUMN id SET DEFAULT nextval('public.contract_types_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.migrations_lock_index_seq'::regclass);


--
-- Data for Name: chevrons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chevrons (id, name, description, created_at, updated_at, "chevronCoefficient", role_ids) FROM stdin;
1	CEO	Giám đốc điều hành	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	5.00	{1}
2	Giám đốc	Giám đốc bộ phận/chi nhánh	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	4.00	{1}
3	Trưởng phòng	Quản lý/Trưởng phòng	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	2.80	{2,4,5,6}
4	Phó phòng	Phó phòng/Trợ lý quản lý	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	2.30	{2,4,5,6}
5	Team Leader	Trưởng nhóm	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	2.00	{2,4,5,6}
6	Chuyên viên cao cấp	Chuyên viên cấp cao/Senior	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	1.80	{2,4,5,6}
7	Chuyên viên	Chuyên viên/Specialist	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	1.50	{2,4,5,6}
8	Nhân viên	Nhân viên thực hiện	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	1.20	{2,4,5,6}
9	Nhân viên sơ cấp	Nhân viên mới/Junior	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	1.00	{2,4,5,6}
10	Thực tập sinh	Thực tập sinh	2026-01-23 16:21:08.26+07	2026-01-23 16:21:08.26+07	0.60	{2,4,5,6}
\.


--
-- Data for Name: contract_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_types (id, name, type, insurance, description, "contractTerm", created_at, updated_at) FROM stdin;
1	Hợp đồng thử việc	1	0	Hợp đồng thử việc 2 tháng	2	2026-01-23 16:21:08.269+07	2026-01-23 16:21:08.269+07
2	Hợp đồng xác định thời hạn 1 năm	2	1	Hợp đồng xác định thời hạn 12 tháng	12	2026-01-23 16:21:08.269+07	2026-01-23 16:21:08.269+07
3	Hợp đồng xác định thời hạn 2 năm	3	1	Hợp đồng xác định thời hạn 24 tháng	24	2026-01-23 16:21:08.269+07	2026-01-23 16:21:08.269+07
4	Hợp đồng không xác định thời hạn	4	1	Hợp đồng không xác định thời hạn (Chính thức)	\N	2026-01-23 16:21:08.269+07	2026-01-23 16:21:08.269+07
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contracts (id, "contractTypeId", "userId", "startDate", "endDate", "activeDay", created_at, updated_at) FROM stdin;
2	3	2	2015-01-01	\N	2015-01-01	2025-11-16 10:24:56.62+07	2025-11-16 10:24:56.62+07
3	3	3	2018-06-01	\N	2018-06-01	2025-11-16 10:24:56.626+07	2025-11-16 10:24:56.626+07
4	3	4	2019-01-01	\N	2019-01-01	2025-11-16 10:24:56.628+07	2025-11-16 10:24:56.628+07
5	3	5	2019-01-01	\N	2019-01-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
6	3	6	2019-01-01	\N	2019-01-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
7	3	7	2019-04-01	\N	2019-04-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
8	3	8	2019-04-01	\N	2019-04-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
9	2	9	2019-09-01	2021-09-01	2019-09-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
10	2	10	2019-12-01	2021-12-01	2019-12-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
11	2	11	2019-08-01	2021-08-01	2019-08-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
12	2	12	2019-01-01	2021-01-01	2019-01-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
13	1	13	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
14	1	14	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
15	1	15	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
16	1	16	2021-10-01	\N	2021-10-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
17	1	17	2021-07-01	\N	2021-07-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
18	1	18	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
19	1	19	2021-08-01	\N	2021-08-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
20	1	20	2021-12-01	\N	2021-12-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
21	1	21	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
22	1	22	2021-01-01	\N	2021-01-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
23	1	23	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
24	1	24	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
25	1	25	2021-07-01	\N	2021-07-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
26	1	26	2021-03-01	\N	2021-03-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
27	1	27	2021-10-01	\N	2021-10-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
28	1	28	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
29	1	29	2021-08-01	\N	2021-08-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
30	1	30	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
31	1	31	2021-10-01	\N	2021-10-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
32	1	32	2021-06-01	\N	2021-06-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
33	1	33	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
34	1	34	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
35	1	35	2021-08-01	\N	2021-08-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
36	1	36	2021-02-01	\N	2021-02-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
37	1	37	2021-03-01	\N	2021-03-01	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07
38	3	38	2019-05-01	\N	2019-05-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
39	2	39	2019-05-01	2021-05-01	2019-05-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
40	2	40	2019-12-01	2021-12-01	2019-12-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
41	2	41	2019-01-01	2021-01-01	2019-01-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
42	2	42	2019-04-01	2021-04-01	2019-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
43	1	43	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
44	1	44	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
45	1	45	2021-01-01	\N	2021-01-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
46	1	46	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
47	1	47	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
48	1	48	2021-10-01	\N	2021-10-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
49	1	49	2021-06-01	\N	2021-06-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
50	1	50	2021-10-01	\N	2021-10-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
51	1	51	2021-01-01	\N	2021-01-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
52	1	52	2021-08-01	\N	2021-08-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
53	1	53	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
54	1	54	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
55	1	55	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
56	1	56	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
57	1	57	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
58	1	58	2021-04-01	\N	2021-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
59	1	59	2021-06-01	\N	2021-06-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
60	1	60	2021-07-01	\N	2021-07-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
61	1	61	2021-07-01	\N	2021-07-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
62	1	62	2021-02-01	\N	2021-02-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
63	1	63	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
64	1	64	2021-02-01	\N	2021-02-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
65	1	65	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
66	1	66	2021-06-01	\N	2021-06-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
67	1	67	2021-01-01	\N	2021-01-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
68	3	68	2019-11-01	\N	2019-11-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
69	2	69	2019-07-01	2021-07-01	2019-07-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
70	2	70	2019-02-01	2021-02-01	2019-02-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
71	2	71	2019-07-01	2021-07-01	2019-07-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
72	1	72	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
73	1	73	2021-02-01	\N	2021-02-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
74	1	74	2021-06-01	\N	2021-06-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
75	1	75	2021-03-01	\N	2021-03-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
76	1	76	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
77	1	77	2021-08-01	\N	2021-08-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
78	1	78	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
79	1	79	2021-08-01	\N	2021-08-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
80	1	80	2021-03-01	\N	2021-03-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
81	1	81	2021-07-01	\N	2021-07-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
82	1	82	2021-03-01	\N	2021-03-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
83	3	83	2019-09-01	\N	2019-09-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
84	2	84	2019-04-01	2021-04-01	2019-04-01	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07
85	2	85	2019-12-01	2021-12-01	2019-12-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
86	2	86	2019-04-01	2021-04-01	2019-04-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
87	1	87	2021-02-01	\N	2021-02-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
88	1	88	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
89	1	89	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
90	1	90	2021-12-01	\N	2021-12-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
91	1	91	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
92	1	92	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
93	1	93	2021-11-01	\N	2021-11-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
94	1	94	2021-10-01	\N	2021-10-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
95	1	95	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
96	3	96	2019-05-01	\N	2019-05-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
97	2	97	2019-03-01	2021-03-01	2019-03-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
98	2	98	2019-09-01	2021-09-01	2019-09-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
99	1	99	2021-02-01	\N	2021-02-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
100	1	100	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
101	1	101	2021-09-01	\N	2021-09-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
102	1	102	2021-06-01	\N	2021-06-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
103	1	103	2021-05-01	\N	2021-05-01	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07
104	1	104	2025-10-31	2026-01-02	2025-11-02	2025-11-16 22:59:29.304+07	2025-11-16 22:59:29.304+07
105	1	112	2025-11-30	2026-02-01	2025-12-01	2025-12-04 15:13:51.887+07	2025-12-04 15:13:51.887+07
106	2	112	2025-12-30	2026-12-31	2025-12-31	2025-12-04 15:17:43.969+07	2025-12-04 15:17:43.969+07
107	1	113	2025-12-10	\N	\N	2025-12-10 17:32:25.674+07	2025-12-10 17:32:25.674+07
115	1	121	2026-01-04	2026-03-06	2026-01-06	2026-01-07 15:54:47.223+07	2026-01-07 15:54:47.223+07
116	2	121	2026-01-06	2027-01-31	2026-01-31	2026-01-07 15:59:58.427+07	2026-01-07 15:59:58.427+07
117	2	122	2026-01-04	2027-01-11	2026-01-11	2026-01-08 00:59:13.688+07	2026-01-08 00:59:13.688+07
118	4	122	2026-01-07	\N	2026-01-11	2026-01-08 01:00:17.739+07	2026-01-08 01:00:17.739+07
119	1	123	2025-12-31	2026-03-03	2026-01-03	2026-01-18 02:04:45.823+07	2026-01-18 02:04:45.823+07
120	2	123	2026-01-11	2027-01-31	2026-01-31	2026-01-18 02:12:44.945+07	2026-01-18 02:12:44.945+07
121	1	123	2025-12-28	2026-02-27	2025-12-29	2026-01-19 15:19:27.73+07	2026-01-19 15:19:27.73+07
122	3	123	2026-12-30	2028-12-31	2026-12-31	2026-01-19 23:22:15.628+07	2026-01-19 23:22:15.628+07
123	1	124	2025-12-27	2026-02-28	2025-12-31	2026-01-19 23:58:57.099+07	2026-01-19 23:58:57.099+07
124	1	125	2025-12-28	2026-02-28	2025-12-31	2026-01-20 14:45:40.549+07	2026-01-20 14:45:40.549+07
125	1	126	2025-12-27	2026-02-28	2025-12-31	2026-01-23 00:26:54.134+07	2026-01-23 00:26:54.134+07
126	2	126	2026-07-27	2027-07-31	2026-07-31	2026-01-23 00:28:27.825+07	2026-01-23 00:28:27.825+07
127	1	127	2025-12-31	2026-03-08	2026-01-08	2026-01-24 20:26:03.897+07	2026-01-24 20:26:03.897+07
128	1	128	2026-01-14	2026-03-25	2026-01-25	2026-01-25 13:56:45.074+07	2026-01-25 13:56:45.074+07
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, description, created_at, updated_at, role_ids) FROM stdin;
1	Ban Giám đốc	Ban lãnh đạo điều hành công ty	2026-01-23 16:21:08.241+07	2026-01-23 16:21:08.241+07	{1}
5	P. Tài chính	Phòng Tài chính - Kế toán - Quản lý tài chính và kế toán	2026-01-23 16:21:08.242+07	2026-01-23 16:21:08.242+07	{4}
6	Phòng Nhân sự	Phòng Nhân sự - Quản lý nguồn nhân lực và đào tạo	2026-01-23 16:21:08.242+07	2026-01-23 16:21:08.242+07	{5}
2	Phòng Công nghệ	Phòng Công nghệ thông tin - Phát triển sản phẩm và hệ thống	2026-01-23 16:21:08.241+07	2026-01-23 16:21:08.241+07	{2}
3	Phòng Kinh doanh	Phòng Kinh doanh - Bán hàng và phát triển thị trường	2026-01-23 16:21:08.241+07	2026-01-23 16:21:08.241+07	{2}
4	Phòng Marketing	Phòng Marketing - Truyền thông và xây dựng thương hiệu	2026-01-23 16:21:08.241+07	2026-01-23 16:21:08.241+07	{2}
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, name, batch, migration_time) FROM stdin;
1	20240101000001_create_chevrons_table.cjs	1	2025-09-06 02:28:36.823+07
2	20240101000002_create_departments_table.cjs	1	2025-09-06 02:28:36.827+07
3	20240101000003_create_contract_types_table.cjs	1	2025-09-06 02:28:36.83+07
4	20240101000004_create_contracts_table.cjs	1	2025-09-06 02:28:36.835+07
5	20240101000005_add_insurance_to_contracts_table.cjs	1	2025-09-06 02:28:36.837+07
6	20240610120000_add_chevronCoefficient_to_chevrons.cjs	1	2025-09-06 02:28:36.838+07
7	20251104000000_remove_insurance_from_contracts.cjs	2	2025-11-04 00:13:52.513+07
9	20260122183840_add_role_ids_to_departments_and_chevrons.cjs	3	2026-01-23 16:21:06.026+07
\.


--
-- Data for Name: migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Name: chevrons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chevrons_id_seq', 10, true);


--
-- Name: contract_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contract_types_id_seq', 4, true);


--
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contracts_id_seq', 128, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 7, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 9, true);


--
-- Name: migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_lock_index_seq', 1, true);


--
-- Name: chevrons chevrons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chevrons
    ADD CONSTRAINT chevrons_pkey PRIMARY KEY (id);


--
-- Name: contract_types contract_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_types
    ADD CONSTRAINT contract_types_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: migrations_lock migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations_lock
    ADD CONSTRAINT migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_contracttypeid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contracttypeid_foreign FOREIGN KEY ("contractTypeId") REFERENCES public.contract_types(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 2o6xygKxtjaNddCbnlqqeq4TQhkmJh5EHaCHlc8QlM61Lhh3WiwLee8Upa0Yf9B

