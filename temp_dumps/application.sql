--
-- PostgreSQL database dump
--

\restrict RgaydLvRfb8SMouhXTljgrWlqvst6xV7sjAfSrBP7X9w6OQz3s3ZYKPLL5f11WZ

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
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    "userId" integer NOT NULL,
    "approvedBy" integer,
    "approvedDate" timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "rejectionReason" text,
    note text,
    reason text,
    "applicationDate" timestamp with time zone
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.applications_id_seq OWNER TO postgres;

--
-- Name: applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_id_seq OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.applications (id, type, status, data, "userId", "approvedBy", "approvedDate", created_at, updated_at, "rejectionReason", note, reason, "applicationDate") FROM stdin;
9365	overtime	1	{"date": "2025-10-03", "reason": "Xử lý công việc tồn đọng", "endTime": "20:03", "startTime": "17:00", "totalHours": 3.1}	1	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
9366	overtime	1	{"date": "2025-10-07", "reason": "Xử lý công việc tồn đọng", "endTime": "20:17", "startTime": "17:00", "totalHours": 3.3}	1	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
9367	overtime	1	{"date": "2025-10-10", "reason": "Xử lý công việc tồn đọng", "endTime": "19:14", "startTime": "17:00", "totalHours": 2.2}	1	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
9368	overtime	1	{"date": "2025-10-13", "reason": "Xử lý công việc tồn đọng", "endTime": "20:28", "startTime": "17:00", "totalHours": 3.5}	1	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
9369	overtime	1	{"date": "2025-10-26", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
9370	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "18:33", "startTime": "17:00", "totalHours": 1.6}	1	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9371	overtime	1	{"date": "2025-10-02", "reason": "Xử lý công việc tồn đọng", "endTime": "18:56", "startTime": "17:00", "totalHours": 1.9}	2	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
9372	overtime	1	{"date": "2025-10-03", "reason": "Xử lý công việc tồn đọng", "endTime": "19:14", "startTime": "17:00", "totalHours": 2.2}	2	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
7289	forgot-check	2	{"reason": "Quên check-in lúc vào hệ thống", "evidence": [], "forgotDate": "2026-01-22", "forgotTime": "09:00", "forgotType": "check-in"}	36	3	2026-01-24 01:47:17.18+07	2026-01-24 01:43:24.549309+07	2026-01-24 01:43:24.549309+07	\N	\N	\N	\N
7290	overtime	2	{"reason": "hoàn thành deadline để đi demo cho khách ", "startTime": "2026-01-24T11:00:00.000Z", "overtimeDate": "2026-01-25T17:00:00.000Z", "overtimeHours": 2}	37	3	2026-01-24 01:47:17.18+07	2026-01-24 01:45:21.216377+07	2026-01-24 01:45:21.216377+07	\N	\N	\N	\N
9373	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	2	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
7293	forgot-check	2	{"reason": "Không", "evidence": [], "forgotDate": "2026-01-24", "forgotTime": "09:00", "forgotType": "check-in"}	3	2	2026-01-24 13:09:17.319+07	2026-01-24 13:08:58.792465+07	2026-01-24 13:08:58.792465+07	\N	\N	\N	\N
9374	overtime	1	{"date": "2025-10-09", "reason": "Xử lý công việc tồn đọng", "endTime": "20:23", "startTime": "17:00", "totalHours": 3.4}	2	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
9375	overtime	1	{"date": "2025-10-16", "reason": "Xử lý công việc tồn đọng", "endTime": "19:38", "startTime": "17:00", "totalHours": 2.6}	2	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
9376	overtime	1	{"date": "2025-10-24", "reason": "Xử lý công việc tồn đọng", "endTime": "20:26", "startTime": "17:00", "totalHours": 3.4}	2	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
9377	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	2	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9378	overtime	1	{"date": "2025-10-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:32", "startTime": "17:00", "totalHours": 2.5}	2	\N	\N	2025-10-28 07:00:00+07	2025-10-28 07:00:00+07	\N	\N	\N	\N
9379	overtime	1	{"date": "2025-10-30", "reason": "Xử lý công việc tồn đọng", "endTime": "20:20", "startTime": "17:00", "totalHours": 3.3}	2	\N	\N	2025-10-30 07:00:00+07	2025-10-30 07:00:00+07	\N	\N	\N	\N
9380	overtime	1	{"date": "2025-10-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:09", "startTime": "17:00", "totalHours": 2.2}	3	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
9381	overtime	1	{"date": "2025-10-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:23", "startTime": "17:00", "totalHours": 2.4}	3	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
9382	overtime	1	{"date": "2025-10-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:13", "startTime": "17:00", "totalHours": 2.2}	3	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
9383	overtime	1	{"date": "2025-10-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:01", "startTime": "17:00", "totalHours": 2}	3	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
9384	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "18:55", "startTime": "17:00", "totalHours": 1.9}	3	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9385	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "20:28", "startTime": "17:00", "totalHours": 3.5}	3	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9386	overtime	1	{"date": "2025-10-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:00", "startTime": "17:00", "totalHours": 2}	4	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
9387	overtime	1	{"date": "2025-10-08", "reason": "Xử lý công việc tồn đọng", "endTime": "19:49", "startTime": "17:00", "totalHours": 2.8}	4	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
9388	overtime	1	{"date": "2025-10-10", "reason": "Xử lý công việc tồn đọng", "endTime": "19:02", "startTime": "17:00", "totalHours": 2}	4	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
9389	overtime	1	{"date": "2025-10-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:36", "startTime": "17:00", "totalHours": 2.6}	4	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
9390	overtime	1	{"date": "2025-10-27", "reason": "Xử lý công việc tồn đọng", "endTime": "19:59", "startTime": "17:00", "totalHours": 3}	4	\N	\N	2025-10-27 07:00:00+07	2025-10-27 07:00:00+07	\N	\N	\N	\N
9391	overtime	1	{"date": "2025-10-30", "reason": "Xử lý công việc tồn đọng", "endTime": "19:04", "startTime": "17:00", "totalHours": 2.1}	4	\N	\N	2025-10-30 07:00:00+07	2025-10-30 07:00:00+07	\N	\N	\N	\N
9392	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "18:45", "startTime": "17:00", "totalHours": 1.8}	4	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9393	overtime	1	{"date": "2025-10-06", "reason": "Xử lý công việc tồn đọng", "endTime": "18:44", "startTime": "17:00", "totalHours": 1.7}	5	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
9394	overtime	1	{"date": "2025-10-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:47", "startTime": "17:00", "totalHours": 2.8}	5	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
9395	overtime	1	{"date": "2025-10-08", "reason": "Xử lý công việc tồn đọng", "endTime": "19:21", "startTime": "17:00", "totalHours": 2.4}	5	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
9396	overtime	1	{"date": "2025-10-13", "reason": "Xử lý công việc tồn đọng", "endTime": "20:25", "startTime": "17:00", "totalHours": 3.4}	5	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
9397	overtime	1	{"date": "2025-10-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:01", "startTime": "17:00", "totalHours": 2}	5	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
9398	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "19:09", "startTime": "17:00", "totalHours": 2.2}	5	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9399	overtime	1	{"date": "2025-10-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:32", "startTime": "17:00", "totalHours": 2.5}	5	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
9400	overtime	1	{"date": "2025-10-26", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	5	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
9401	overtime	1	{"date": "2025-10-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:45", "startTime": "17:00", "totalHours": 2.8}	5	\N	\N	2025-10-28 07:00:00+07	2025-10-28 07:00:00+07	\N	\N	\N	\N
9402	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9403	overtime	1	{"date": "2025-10-05", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	7	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
9404	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "18:59", "startTime": "17:00", "totalHours": 2}	7	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9405	overtime	1	{"date": "2025-10-05", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
9406	overtime	1	{"date": "2025-10-11", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2025-10-11 07:00:00+07	2025-10-11 07:00:00+07	\N	\N	\N	\N
9407	overtime	1	{"date": "2025-10-12", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
9408	overtime	1	{"date": "2025-10-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:54", "startTime": "17:00", "totalHours": 2.9}	8	\N	\N	2025-10-21 07:00:00+07	2025-10-21 07:00:00+07	\N	\N	\N	\N
9409	overtime	1	{"date": "2025-10-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:54", "startTime": "17:00", "totalHours": 2.9}	8	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
9410	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9411	overtime	1	{"date": "2025-10-09", "reason": "Xử lý công việc tồn đọng", "endTime": "20:28", "startTime": "17:00", "totalHours": 3.5}	9	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
9412	overtime	1	{"date": "2025-10-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:49", "startTime": "17:00", "totalHours": 2.8}	9	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
9413	overtime	1	{"date": "2025-10-29", "reason": "Xử lý công việc tồn đọng", "endTime": "19:44", "startTime": "17:00", "totalHours": 2.7}	9	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
9414	overtime	1	{"date": "2025-10-08", "reason": "Xử lý công việc tồn đọng", "endTime": "19:13", "startTime": "17:00", "totalHours": 2.2}	10	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
9415	overtime	1	{"date": "2025-10-12", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	10	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
9416	overtime	1	{"date": "2025-10-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:39", "startTime": "17:00", "totalHours": 2.7}	10	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
9417	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	10	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9418	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
9419	overtime	1	{"date": "2025-10-19", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
9420	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9421	overtime	1	{"date": "2025-10-29", "reason": "Xử lý công việc tồn đọng", "endTime": "20:13", "startTime": "17:00", "totalHours": 3.2}	11	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
9422	overtime	1	{"date": "2025-10-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2025-10-18 07:00:00+07	2025-10-18 07:00:00+07	\N	\N	\N	\N
9423	overtime	1	{"date": "2025-10-03", "reason": "Xử lý công việc tồn đọng", "endTime": "19:43", "startTime": "17:00", "totalHours": 2.7}	13	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
9424	overtime	1	{"date": "2025-10-09", "reason": "Xử lý công việc tồn đọng", "endTime": "19:23", "startTime": "17:00", "totalHours": 2.4}	13	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
9425	overtime	1	{"date": "2025-10-11", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	13	\N	\N	2025-10-11 07:00:00+07	2025-10-11 07:00:00+07	\N	\N	\N	\N
9426	overtime	1	{"date": "2025-10-16", "reason": "Xử lý công việc tồn đọng", "endTime": "19:39", "startTime": "17:00", "totalHours": 2.7}	13	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
9427	overtime	1	{"date": "2025-10-03", "reason": "Xử lý công việc tồn đọng", "endTime": "19:27", "startTime": "17:00", "totalHours": 2.5}	14	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
9428	overtime	1	{"date": "2025-10-01", "reason": "Xử lý công việc tồn đọng", "endTime": "20:21", "startTime": "17:00", "totalHours": 3.4}	15	\N	\N	2025-10-01 07:00:00+07	2025-10-01 07:00:00+07	\N	\N	\N	\N
9429	overtime	1	{"date": "2025-10-02", "reason": "Xử lý công việc tồn đọng", "endTime": "20:06", "startTime": "17:00", "totalHours": 3.1}	15	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
9430	overtime	1	{"date": "2025-10-05", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
9431	overtime	1	{"date": "2025-10-12", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
9432	overtime	1	{"date": "2025-10-30", "reason": "Xử lý công việc tồn đọng", "endTime": "19:58", "startTime": "17:00", "totalHours": 3}	15	\N	\N	2025-10-30 07:00:00+07	2025-10-30 07:00:00+07	\N	\N	\N	\N
9433	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:03", "startTime": "17:00", "totalHours": 2.1}	15	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9434	overtime	1	{"date": "2025-10-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:19", "startTime": "17:00", "totalHours": 2.3}	16	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
9435	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
9436	overtime	1	{"date": "2025-10-08", "reason": "Xử lý công việc tồn đọng", "endTime": "20:09", "startTime": "17:00", "totalHours": 3.2}	17	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
9437	overtime	1	{"date": "2025-10-10", "reason": "Xử lý công việc tồn đọng", "endTime": "19:11", "startTime": "17:00", "totalHours": 2.2}	17	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
9438	overtime	1	{"date": "2025-10-13", "reason": "Xử lý công việc tồn đọng", "endTime": "20:05", "startTime": "17:00", "totalHours": 3.1}	17	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
9439	overtime	1	{"date": "2025-10-19", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
9440	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:01", "startTime": "17:00", "totalHours": 2}	17	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9441	overtime	1	{"date": "2025-10-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:12", "startTime": "17:00", "totalHours": 2.2}	18	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
9442	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "19:25", "startTime": "17:00", "totalHours": 2.4}	18	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9443	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "19:35", "startTime": "17:00", "totalHours": 2.6}	19	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9444	overtime	1	{"date": "2025-10-21", "reason": "Xử lý công việc tồn đọng", "endTime": "18:32", "startTime": "17:00", "totalHours": 1.5}	19	\N	\N	2025-10-21 07:00:00+07	2025-10-21 07:00:00+07	\N	\N	\N	\N
9445	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9446	overtime	1	{"date": "2025-10-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:54", "startTime": "17:00", "totalHours": 2.9}	20	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
9447	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9448	overtime	1	{"date": "2025-10-26", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
9449	overtime	1	{"date": "2025-10-03", "reason": "Xử lý công việc tồn đọng", "endTime": "20:27", "startTime": "17:00", "totalHours": 3.5}	21	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
9450	overtime	1	{"date": "2025-10-19", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	21	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
9451	overtime	1	{"date": "2025-10-24", "reason": "Xử lý công việc tồn đọng", "endTime": "18:34", "startTime": "17:00", "totalHours": 1.6}	22	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
9452	overtime	1	{"date": "2025-10-29", "reason": "Xử lý công việc tồn đọng", "endTime": "19:02", "startTime": "17:00", "totalHours": 2}	22	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
9453	overtime	1	{"date": "2025-10-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:25", "startTime": "17:00", "totalHours": 2.4}	23	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
9454	overtime	1	{"date": "2025-10-08", "reason": "Xử lý công việc tồn đọng", "endTime": "19:57", "startTime": "17:00", "totalHours": 3}	23	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
9455	overtime	1	{"date": "2025-10-12", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
9456	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "19:19", "startTime": "17:00", "totalHours": 2.3}	23	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9457	overtime	1	{"date": "2025-10-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:13", "startTime": "17:00", "totalHours": 2.2}	24	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
9458	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "18:42", "startTime": "17:00", "totalHours": 1.7}	24	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9459	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9460	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:59", "startTime": "17:00", "totalHours": 3}	25	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9461	overtime	1	{"date": "2025-10-16", "reason": "Xử lý công việc tồn đọng", "endTime": "19:16", "startTime": "17:00", "totalHours": 2.3}	26	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
9462	overtime	1	{"date": "2025-10-05", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	27	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
9463	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "20:08", "startTime": "17:00", "totalHours": 3.1}	27	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9464	overtime	1	{"date": "2025-10-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:04", "startTime": "17:00", "totalHours": 2.1}	28	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
9465	overtime	1	{"date": "2025-10-02", "reason": "Xử lý công việc tồn đọng", "endTime": "18:59", "startTime": "17:00", "totalHours": 2}	29	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
9466	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
9467	overtime	1	{"date": "2025-10-19", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
9468	overtime	1	{"date": "2025-10-07", "reason": "Xử lý công việc tồn đọng", "endTime": "18:32", "startTime": "17:00", "totalHours": 1.5}	31	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
9469	overtime	1	{"date": "2025-10-12", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
9470	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	32	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
9471	overtime	1	{"date": "2025-10-14", "reason": "Xử lý công việc tồn đọng", "endTime": "20:17", "startTime": "17:00", "totalHours": 3.3}	32	\N	\N	2025-10-14 07:00:00+07	2025-10-14 07:00:00+07	\N	\N	\N	\N
9472	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	33	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
9473	overtime	1	{"date": "2025-10-26", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	33	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
9474	overtime	1	{"date": "2025-10-01", "reason": "Xử lý công việc tồn đọng", "endTime": "20:29", "startTime": "17:00", "totalHours": 3.5}	34	\N	\N	2025-10-01 07:00:00+07	2025-10-01 07:00:00+07	\N	\N	\N	\N
9475	overtime	1	{"date": "2025-10-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:17", "startTime": "17:00", "totalHours": 2.3}	34	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
9476	overtime	1	{"date": "2025-10-08", "reason": "Xử lý công việc tồn đọng", "endTime": "18:31", "startTime": "17:00", "totalHours": 1.5}	35	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
9477	overtime	1	{"date": "2025-10-19", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	36	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
9478	overtime	1	{"date": "2025-10-26", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	36	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
9479	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	37	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9480	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "20:19", "startTime": "17:00", "totalHours": 3.3}	37	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9481	overtime	1	{"date": "2025-10-05", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	38	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
9482	overtime	1	{"date": "2025-10-15", "reason": "Xử lý công việc tồn đọng", "endTime": "20:22", "startTime": "17:00", "totalHours": 3.4}	38	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
9483	overtime	1	{"date": "2025-10-17", "reason": "Xử lý công việc tồn đọng", "endTime": "20:16", "startTime": "17:00", "totalHours": 3.3}	38	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
9484	overtime	1	{"date": "2025-10-03", "reason": "Xử lý công việc tồn đọng", "endTime": "18:31", "startTime": "17:00", "totalHours": 1.5}	39	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
9485	overtime	1	{"date": "2025-10-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	39	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
9486	overtime	1	{"date": "2025-10-26", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	40	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
9487	overtime	1	{"date": "2025-10-06", "reason": "Xử lý công việc tồn đọng", "endTime": "18:34", "startTime": "17:00", "totalHours": 1.6}	42	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
9488	overtime	1	{"date": "2025-10-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2025-10-18 07:00:00+07	2025-10-18 07:00:00+07	\N	\N	\N	\N
9489	overtime	1	{"date": "2025-10-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:00", "startTime": "17:00", "totalHours": 2}	42	\N	\N	2025-10-21 07:00:00+07	2025-10-21 07:00:00+07	\N	\N	\N	\N
9490	overtime	1	{"date": "2025-10-31", "reason": "Xử lý công việc tồn đọng", "endTime": "20:14", "startTime": "17:00", "totalHours": 3.2}	43	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
9491	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	44	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
9492	overtime	1	{"date": "2025-10-11", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	44	\N	\N	2025-10-11 07:00:00+07	2025-10-11 07:00:00+07	\N	\N	\N	\N
9493	overtime	1	{"date": "2025-10-03", "reason": "Xử lý công việc tồn đọng", "endTime": "19:05", "startTime": "17:00", "totalHours": 2.1}	45	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
9494	overtime	1	{"date": "2025-10-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:17", "startTime": "17:00", "totalHours": 2.3}	45	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
9495	overtime	1	{"date": "2025-10-12", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	46	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
9496	overtime	1	{"date": "2025-10-15", "reason": "Xử lý công việc tồn đọng", "endTime": "18:43", "startTime": "17:00", "totalHours": 1.7}	46	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
9497	overtime	1	{"date": "2025-10-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	48	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
9498	overtime	1	{"date": "2025-10-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:53", "startTime": "17:00", "totalHours": 2.9}	48	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
9499	overtime	1	{"date": "2025-10-29", "reason": "Xử lý công việc tồn đọng", "endTime": "20:11", "startTime": "17:00", "totalHours": 3.2}	48	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
9500	overtime	1	{"date": "2025-10-09", "reason": "Xử lý công việc tồn đọng", "endTime": "20:29", "startTime": "17:00", "totalHours": 3.5}	50	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
9501	overtime	1	{"date": "2025-10-26", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	50	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
9502	overtime	1	{"date": "2025-10-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:35", "startTime": "17:00", "totalHours": 2.6}	50	\N	\N	2025-10-28 07:00:00+07	2025-10-28 07:00:00+07	\N	\N	\N	\N
9503	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9504	overtime	1	{"date": "2025-11-03", "reason": "Xử lý công việc tồn đọng", "endTime": "20:04", "startTime": "17:00", "totalHours": 3.1}	1	\N	\N	2025-11-03 07:00:00+07	2025-11-03 07:00:00+07	\N	\N	\N	\N
9505	overtime	1	{"date": "2025-11-04", "reason": "Xử lý công việc tồn đọng", "endTime": "18:32", "startTime": "17:00", "totalHours": 1.5}	1	\N	\N	2025-11-04 07:00:00+07	2025-11-04 07:00:00+07	\N	\N	\N	\N
9506	overtime	1	{"date": "2025-11-10", "reason": "Xử lý công việc tồn đọng", "endTime": "18:32", "startTime": "17:00", "totalHours": 1.5}	1	\N	\N	2025-11-10 07:00:00+07	2025-11-10 07:00:00+07	\N	\N	\N	\N
9507	overtime	1	{"date": "2025-11-12", "reason": "Xử lý công việc tồn đọng", "endTime": "20:00", "startTime": "17:00", "totalHours": 3}	1	\N	\N	2025-11-12 07:00:00+07	2025-11-12 07:00:00+07	\N	\N	\N	\N
9508	overtime	1	{"date": "2025-11-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:36", "startTime": "17:00", "totalHours": 2.6}	1	\N	\N	2025-11-13 07:00:00+07	2025-11-13 07:00:00+07	\N	\N	\N	\N
9509	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "20:27", "startTime": "17:00", "totalHours": 3.5}	1	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9510	overtime	1	{"date": "2025-11-24", "reason": "Xử lý công việc tồn đọng", "endTime": "20:13", "startTime": "17:00", "totalHours": 3.2}	1	\N	\N	2025-11-24 07:00:00+07	2025-11-24 07:00:00+07	\N	\N	\N	\N
9511	overtime	1	{"date": "2025-11-27", "reason": "Xử lý công việc tồn đọng", "endTime": "20:26", "startTime": "17:00", "totalHours": 3.4}	1	\N	\N	2025-11-27 07:00:00+07	2025-11-27 07:00:00+07	\N	\N	\N	\N
9512	overtime	1	{"date": "2025-11-05", "reason": "Xử lý công việc tồn đọng", "endTime": "18:31", "startTime": "17:00", "totalHours": 1.5}	2	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
9513	overtime	1	{"date": "2025-11-12", "reason": "Xử lý công việc tồn đọng", "endTime": "19:36", "startTime": "17:00", "totalHours": 2.6}	2	\N	\N	2025-11-12 07:00:00+07	2025-11-12 07:00:00+07	\N	\N	\N	\N
9514	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:23", "startTime": "17:00", "totalHours": 2.4}	2	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9515	overtime	1	{"date": "2025-11-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:29", "startTime": "17:00", "totalHours": 2.5}	2	\N	\N	2025-11-24 07:00:00+07	2025-11-24 07:00:00+07	\N	\N	\N	\N
9516	overtime	1	{"date": "2025-11-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:23", "startTime": "17:00", "totalHours": 2.4}	2	\N	\N	2025-11-28 07:00:00+07	2025-11-28 07:00:00+07	\N	\N	\N	\N
9517	overtime	1	{"date": "2025-11-04", "reason": "Xử lý công việc tồn đọng", "endTime": "19:55", "startTime": "17:00", "totalHours": 2.9}	3	\N	\N	2025-11-04 07:00:00+07	2025-11-04 07:00:00+07	\N	\N	\N	\N
9518	overtime	1	{"date": "2025-11-05", "reason": "Xử lý công việc tồn đọng", "endTime": "18:35", "startTime": "17:00", "totalHours": 1.6}	3	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
9519	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "18:58", "startTime": "17:00", "totalHours": 2}	3	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9520	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	3	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9521	overtime	1	{"date": "2025-11-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:38", "startTime": "17:00", "totalHours": 2.6}	4	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
9522	overtime	1	{"date": "2025-11-07", "reason": "Xử lý công việc tồn đọng", "endTime": "18:34", "startTime": "17:00", "totalHours": 1.6}	4	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
9523	overtime	1	{"date": "2025-11-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:21", "startTime": "17:00", "totalHours": 2.4}	4	\N	\N	2025-11-13 07:00:00+07	2025-11-13 07:00:00+07	\N	\N	\N	\N
9524	overtime	1	{"date": "2025-11-17", "reason": "Xử lý công việc tồn đọng", "endTime": "19:32", "startTime": "17:00", "totalHours": 2.5}	4	\N	\N	2025-11-17 07:00:00+07	2025-11-17 07:00:00+07	\N	\N	\N	\N
9525	overtime	1	{"date": "2025-11-20", "reason": "Xử lý công việc tồn đọng", "endTime": "18:48", "startTime": "17:00", "totalHours": 1.8}	4	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
9526	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	4	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9527	overtime	1	{"date": "2025-11-26", "reason": "Xử lý công việc tồn đọng", "endTime": "20:18", "startTime": "17:00", "totalHours": 3.3}	4	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
9528	overtime	1	{"date": "2025-11-28", "reason": "Xử lý công việc tồn đọng", "endTime": "18:43", "startTime": "17:00", "totalHours": 1.7}	4	\N	\N	2025-11-28 07:00:00+07	2025-11-28 07:00:00+07	\N	\N	\N	\N
9529	overtime	1	{"date": "2025-11-30", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	4	\N	\N	2025-11-30 07:00:00+07	2025-11-30 07:00:00+07	\N	\N	\N	\N
9530	overtime	1	{"date": "2025-11-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	5	\N	\N	2025-11-06 07:00:00+07	2025-11-06 07:00:00+07	\N	\N	\N	\N
9531	overtime	1	{"date": "2025-11-10", "reason": "Xử lý công việc tồn đọng", "endTime": "19:48", "startTime": "17:00", "totalHours": 2.8}	5	\N	\N	2025-11-10 07:00:00+07	2025-11-10 07:00:00+07	\N	\N	\N	\N
9532	overtime	1	{"date": "2025-11-11", "reason": "Xử lý công việc tồn đọng", "endTime": "19:32", "startTime": "17:00", "totalHours": 2.5}	5	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
9533	overtime	1	{"date": "2025-11-20", "reason": "Xử lý công việc tồn đọng", "endTime": "19:24", "startTime": "17:00", "totalHours": 2.4}	5	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
9534	overtime	1	{"date": "2025-11-25", "reason": "Xử lý công việc tồn đọng", "endTime": "19:13", "startTime": "17:00", "totalHours": 2.2}	5	\N	\N	2025-11-25 07:00:00+07	2025-11-25 07:00:00+07	\N	\N	\N	\N
9535	overtime	1	{"date": "2025-11-26", "reason": "Xử lý công việc tồn đọng", "endTime": "19:42", "startTime": "17:00", "totalHours": 2.7}	5	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
9536	overtime	1	{"date": "2025-11-27", "reason": "Xử lý công việc tồn đọng", "endTime": "19:14", "startTime": "17:00", "totalHours": 2.2}	5	\N	\N	2025-11-27 07:00:00+07	2025-11-27 07:00:00+07	\N	\N	\N	\N
9537	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9538	overtime	1	{"date": "2025-11-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:55", "startTime": "17:00", "totalHours": 2.9}	6	\N	\N	2025-11-24 07:00:00+07	2025-11-24 07:00:00+07	\N	\N	\N	\N
9539	overtime	1	{"date": "2025-11-05", "reason": "Xử lý công việc tồn đọng", "endTime": "18:54", "startTime": "17:00", "totalHours": 1.9}	7	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
9540	overtime	1	{"date": "2025-11-15", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	7	\N	\N	2025-11-15 07:00:00+07	2025-11-15 07:00:00+07	\N	\N	\N	\N
9541	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9542	overtime	1	{"date": "2025-11-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	9	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
9543	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	9	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9544	overtime	1	{"date": "2025-11-16", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	10	\N	\N	2025-11-16 07:00:00+07	2025-11-16 07:00:00+07	\N	\N	\N	\N
9545	overtime	1	{"date": "2025-11-24", "reason": "Xử lý công việc tồn đọng", "endTime": "18:38", "startTime": "17:00", "totalHours": 1.6}	10	\N	\N	2025-11-24 07:00:00+07	2025-11-24 07:00:00+07	\N	\N	\N	\N
9546	overtime	1	{"date": "2025-11-07", "reason": "Xử lý công việc tồn đọng", "endTime": "20:28", "startTime": "17:00", "totalHours": 3.5}	11	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
9547	overtime	1	{"date": "2025-11-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
9548	overtime	1	{"date": "2025-11-20", "reason": "Xử lý công việc tồn đọng", "endTime": "19:23", "startTime": "17:00", "totalHours": 2.4}	11	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
9549	overtime	1	{"date": "2025-11-23", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
9550	overtime	1	{"date": "2025-11-01", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
9551	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9552	overtime	1	{"date": "2025-11-09", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2025-11-09 07:00:00+07	2025-11-09 07:00:00+07	\N	\N	\N	\N
9553	overtime	1	{"date": "2025-11-11", "reason": "Xử lý công việc tồn đọng", "endTime": "19:49", "startTime": "17:00", "totalHours": 2.8}	14	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
9554	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "20:05", "startTime": "17:00", "totalHours": 3.1}	14	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9555	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9556	overtime	1	{"date": "2025-11-16", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2025-11-16 07:00:00+07	2025-11-16 07:00:00+07	\N	\N	\N	\N
9557	overtime	1	{"date": "2025-11-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:46", "startTime": "17:00", "totalHours": 2.8}	16	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
9558	overtime	1	{"date": "2025-11-11", "reason": "Xử lý công việc tồn đọng", "endTime": "19:24", "startTime": "17:00", "totalHours": 2.4}	16	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
9559	overtime	1	{"date": "2025-11-16", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2025-11-16 07:00:00+07	2025-11-16 07:00:00+07	\N	\N	\N	\N
9560	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9561	overtime	1	{"date": "2025-11-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
9562	overtime	1	{"date": "2025-11-20", "reason": "Xử lý công việc tồn đọng", "endTime": "18:48", "startTime": "17:00", "totalHours": 1.8}	17	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
9563	overtime	1	{"date": "2025-11-07", "reason": "Xử lý công việc tồn đọng", "endTime": "20:12", "startTime": "17:00", "totalHours": 3.2}	18	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
9564	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:30", "startTime": "17:00", "totalHours": 2.5}	18	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9565	overtime	1	{"date": "2025-11-23", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	18	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
9566	overtime	1	{"date": "2025-11-01", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
9567	overtime	1	{"date": "2025-11-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
9568	overtime	1	{"date": "2025-11-13", "reason": "Xử lý công việc tồn đọng", "endTime": "20:10", "startTime": "17:00", "totalHours": 3.2}	19	\N	\N	2025-11-13 07:00:00+07	2025-11-13 07:00:00+07	\N	\N	\N	\N
9569	overtime	1	{"date": "2025-11-29", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
9570	overtime	1	{"date": "2025-11-26", "reason": "Xử lý công việc tồn đọng", "endTime": "19:14", "startTime": "17:00", "totalHours": 2.2}	20	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
9571	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	22	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9572	overtime	1	{"date": "2025-11-14", "reason": "Xử lý công việc tồn đọng", "endTime": "19:48", "startTime": "17:00", "totalHours": 2.8}	22	\N	\N	2025-11-14 07:00:00+07	2025-11-14 07:00:00+07	\N	\N	\N	\N
9573	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	22	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9574	overtime	1	{"date": "2025-11-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
9575	overtime	1	{"date": "2025-11-30", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2025-11-30 07:00:00+07	2025-11-30 07:00:00+07	\N	\N	\N	\N
9576	overtime	1	{"date": "2025-11-09", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2025-11-09 07:00:00+07	2025-11-09 07:00:00+07	\N	\N	\N	\N
9577	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	26	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9578	overtime	1	{"date": "2025-11-20", "reason": "Xử lý công việc tồn đọng", "endTime": "19:40", "startTime": "17:00", "totalHours": 2.7}	27	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
9579	overtime	1	{"date": "2025-11-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:06", "startTime": "17:00", "totalHours": 2.1}	28	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
9580	overtime	1	{"date": "2025-11-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:47", "startTime": "17:00", "totalHours": 2.8}	28	\N	\N	2025-11-06 07:00:00+07	2025-11-06 07:00:00+07	\N	\N	\N	\N
9581	overtime	1	{"date": "2025-11-11", "reason": "Xử lý công việc tồn đọng", "endTime": "19:37", "startTime": "17:00", "totalHours": 2.6}	28	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
9582	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "18:40", "startTime": "17:00", "totalHours": 1.7}	28	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9583	overtime	1	{"date": "2025-11-29", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	28	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
9584	overtime	1	{"date": "2025-11-29", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
9585	overtime	1	{"date": "2025-11-09", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2025-11-09 07:00:00+07	2025-11-09 07:00:00+07	\N	\N	\N	\N
9586	overtime	1	{"date": "2025-11-15", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2025-11-15 07:00:00+07	2025-11-15 07:00:00+07	\N	\N	\N	\N
9587	overtime	1	{"date": "2025-11-16", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2025-11-16 07:00:00+07	2025-11-16 07:00:00+07	\N	\N	\N	\N
9588	overtime	1	{"date": "2025-11-16", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2025-11-16 07:00:00+07	2025-11-16 07:00:00+07	\N	\N	\N	\N
9589	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9590	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	32	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9591	overtime	1	{"date": "2025-11-15", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	32	\N	\N	2025-11-15 07:00:00+07	2025-11-15 07:00:00+07	\N	\N	\N	\N
9592	overtime	1	{"date": "2025-11-18", "reason": "Xử lý công việc tồn đọng", "endTime": "19:17", "startTime": "17:00", "totalHours": 2.3}	33	\N	\N	2025-11-18 07:00:00+07	2025-11-18 07:00:00+07	\N	\N	\N	\N
9593	overtime	1	{"date": "2025-11-22", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	33	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
9594	overtime	1	{"date": "2025-11-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:11", "startTime": "17:00", "totalHours": 2.2}	35	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
9595	overtime	1	{"date": "2025-11-10", "reason": "Xử lý công việc tồn đọng", "endTime": "19:44", "startTime": "17:00", "totalHours": 2.7}	35	\N	\N	2025-11-10 07:00:00+07	2025-11-10 07:00:00+07	\N	\N	\N	\N
9596	overtime	1	{"date": "2025-11-14", "reason": "Xử lý công việc tồn đọng", "endTime": "20:08", "startTime": "17:00", "totalHours": 3.1}	35	\N	\N	2025-11-14 07:00:00+07	2025-11-14 07:00:00+07	\N	\N	\N	\N
9597	overtime	1	{"date": "2025-11-19", "reason": "Xử lý công việc tồn đọng", "endTime": "20:18", "startTime": "17:00", "totalHours": 3.3}	35	\N	\N	2025-11-19 07:00:00+07	2025-11-19 07:00:00+07	\N	\N	\N	\N
9598	overtime	1	{"date": "2025-11-20", "reason": "Xử lý công việc tồn đọng", "endTime": "20:16", "startTime": "17:00", "totalHours": 3.3}	35	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
9599	overtime	1	{"date": "2025-11-23", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	35	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
9600	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	36	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9601	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:03", "startTime": "17:00", "totalHours": 2.1}	37	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9602	overtime	1	{"date": "2025-11-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	38	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
9603	overtime	1	{"date": "2025-11-29", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	39	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
9604	overtime	1	{"date": "2025-11-30", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	39	\N	\N	2025-11-30 07:00:00+07	2025-11-30 07:00:00+07	\N	\N	\N	\N
9605	overtime	1	{"date": "2025-11-14", "reason": "Xử lý công việc tồn đọng", "endTime": "19:08", "startTime": "17:00", "totalHours": 2.1}	40	\N	\N	2025-11-14 07:00:00+07	2025-11-14 07:00:00+07	\N	\N	\N	\N
9606	overtime	1	{"date": "2025-11-19", "reason": "Xử lý công việc tồn đọng", "endTime": "19:05", "startTime": "17:00", "totalHours": 2.1}	40	\N	\N	2025-11-19 07:00:00+07	2025-11-19 07:00:00+07	\N	\N	\N	\N
9607	overtime	1	{"date": "2025-11-27", "reason": "Xử lý công việc tồn đọng", "endTime": "18:53", "startTime": "17:00", "totalHours": 1.9}	40	\N	\N	2025-11-27 07:00:00+07	2025-11-27 07:00:00+07	\N	\N	\N	\N
9608	overtime	1	{"date": "2025-11-15", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	41	\N	\N	2025-11-15 07:00:00+07	2025-11-15 07:00:00+07	\N	\N	\N	\N
9609	overtime	1	{"date": "2025-11-17", "reason": "Xử lý công việc tồn đọng", "endTime": "19:46", "startTime": "17:00", "totalHours": 2.8}	41	\N	\N	2025-11-17 07:00:00+07	2025-11-17 07:00:00+07	\N	\N	\N	\N
9610	overtime	1	{"date": "2025-11-26", "reason": "Xử lý công việc tồn đọng", "endTime": "18:57", "startTime": "17:00", "totalHours": 2}	41	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
9611	overtime	1	{"date": "2025-11-02", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
9612	overtime	1	{"date": "2025-11-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:40", "startTime": "17:00", "totalHours": 2.7}	43	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
9613	overtime	1	{"date": "2025-11-11", "reason": "Xử lý công việc tồn đọng", "endTime": "18:52", "startTime": "17:00", "totalHours": 1.9}	43	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
9614	overtime	1	{"date": "2025-11-23", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	43	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
9615	overtime	1	{"date": "2025-11-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:49", "startTime": "17:00", "totalHours": 2.8}	44	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
9616	overtime	1	{"date": "2025-11-09", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	44	\N	\N	2025-11-09 07:00:00+07	2025-11-09 07:00:00+07	\N	\N	\N	\N
9617	overtime	1	{"date": "2025-11-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:37", "startTime": "17:00", "totalHours": 2.6}	44	\N	\N	2025-11-13 07:00:00+07	2025-11-13 07:00:00+07	\N	\N	\N	\N
9618	overtime	1	{"date": "2025-11-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:46", "startTime": "17:00", "totalHours": 2.8}	44	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
9619	overtime	1	{"date": "2025-11-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:47", "startTime": "17:00", "totalHours": 2.8}	45	\N	\N	2025-11-24 07:00:00+07	2025-11-24 07:00:00+07	\N	\N	\N	\N
9620	overtime	1	{"date": "2025-11-26", "reason": "Xử lý công việc tồn đọng", "endTime": "19:30", "startTime": "17:00", "totalHours": 2.5}	46	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
9621	overtime	1	{"date": "2025-11-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:03", "startTime": "17:00", "totalHours": 2.1}	47	\N	\N	2025-11-28 07:00:00+07	2025-11-28 07:00:00+07	\N	\N	\N	\N
9622	overtime	1	{"date": "2025-11-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	48	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
9623	overtime	1	{"date": "2025-11-27", "reason": "Xử lý công việc tồn đọng", "endTime": "19:11", "startTime": "17:00", "totalHours": 2.2}	48	\N	\N	2025-11-27 07:00:00+07	2025-11-27 07:00:00+07	\N	\N	\N	\N
9624	overtime	1	{"date": "2025-11-10", "reason": "Xử lý công việc tồn đọng", "endTime": "18:59", "startTime": "17:00", "totalHours": 2}	49	\N	\N	2025-11-10 07:00:00+07	2025-11-10 07:00:00+07	\N	\N	\N	\N
9625	overtime	1	{"date": "2025-11-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:05", "startTime": "17:00", "totalHours": 2.1}	49	\N	\N	2025-11-13 07:00:00+07	2025-11-13 07:00:00+07	\N	\N	\N	\N
9626	overtime	1	{"date": "2025-11-23", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	49	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
9627	overtime	1	{"date": "2025-11-03", "reason": "Xử lý công việc tồn đọng", "endTime": "18:39", "startTime": "17:00", "totalHours": 1.7}	50	\N	\N	2025-11-03 07:00:00+07	2025-11-03 07:00:00+07	\N	\N	\N	\N
9628	overtime	1	{"date": "2025-11-10", "reason": "Xử lý công việc tồn đọng", "endTime": "18:35", "startTime": "17:00", "totalHours": 1.6}	50	\N	\N	2025-11-10 07:00:00+07	2025-11-10 07:00:00+07	\N	\N	\N	\N
9629	overtime	1	{"date": "2025-11-29", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	50	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
9630	overtime	1	{"date": "2025-11-30", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	50	\N	\N	2025-11-30 07:00:00+07	2025-11-30 07:00:00+07	\N	\N	\N	\N
9631	overtime	1	{"date": "2025-12-01", "reason": "Xử lý công việc tồn đọng", "endTime": "20:05", "startTime": "17:00", "totalHours": 3.1}	1	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
9632	overtime	1	{"date": "2025-12-04", "reason": "Xử lý công việc tồn đọng", "endTime": "18:57", "startTime": "17:00", "totalHours": 2}	1	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
9633	overtime	1	{"date": "2025-12-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
9634	overtime	1	{"date": "2025-12-08", "reason": "Xử lý công việc tồn đọng", "endTime": "19:16", "startTime": "17:00", "totalHours": 2.3}	1	\N	\N	2025-12-08 07:00:00+07	2025-12-08 07:00:00+07	\N	\N	\N	\N
9635	overtime	1	{"date": "2025-12-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:39", "startTime": "17:00", "totalHours": 2.7}	1	\N	\N	2025-12-15 07:00:00+07	2025-12-15 07:00:00+07	\N	\N	\N	\N
9636	overtime	1	{"date": "2025-12-20", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2025-12-20 07:00:00+07	2025-12-20 07:00:00+07	\N	\N	\N	\N
9637	overtime	1	{"date": "2025-12-22", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	1	\N	\N	2025-12-22 07:00:00+07	2025-12-22 07:00:00+07	\N	\N	\N	\N
9638	overtime	1	{"date": "2025-12-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:00", "startTime": "17:00", "totalHours": 2}	1	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
9639	overtime	1	{"date": "2025-12-04", "reason": "Xử lý công việc tồn đọng", "endTime": "18:47", "startTime": "17:00", "totalHours": 1.8}	2	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
9640	overtime	1	{"date": "2025-12-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:35", "startTime": "17:00", "totalHours": 2.6}	2	\N	\N	2025-12-05 07:00:00+07	2025-12-05 07:00:00+07	\N	\N	\N	\N
9641	overtime	1	{"date": "2025-12-11", "reason": "Xử lý công việc tồn đọng", "endTime": "18:45", "startTime": "17:00", "totalHours": 1.8}	2	\N	\N	2025-12-11 07:00:00+07	2025-12-11 07:00:00+07	\N	\N	\N	\N
9642	overtime	1	{"date": "2025-12-13", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	2	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
9643	overtime	1	{"date": "2025-12-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:58", "startTime": "17:00", "totalHours": 3}	2	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
9644	overtime	1	{"date": "2025-12-26", "reason": "Xử lý công việc tồn đọng", "endTime": "19:17", "startTime": "17:00", "totalHours": 2.3}	2	\N	\N	2025-12-26 07:00:00+07	2025-12-26 07:00:00+07	\N	\N	\N	\N
9645	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:29", "startTime": "17:00", "totalHours": 2.5}	2	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9646	overtime	1	{"date": "2025-12-02", "reason": "Xử lý công việc tồn đọng", "endTime": "18:44", "startTime": "17:00", "totalHours": 1.7}	3	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
9647	overtime	1	{"date": "2025-12-04", "reason": "Xử lý công việc tồn đọng", "endTime": "19:07", "startTime": "17:00", "totalHours": 2.1}	3	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
9648	overtime	1	{"date": "2025-12-14", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	3	\N	\N	2025-12-14 07:00:00+07	2025-12-14 07:00:00+07	\N	\N	\N	\N
9649	overtime	1	{"date": "2025-12-15", "reason": "Xử lý công việc tồn đọng", "endTime": "20:24", "startTime": "17:00", "totalHours": 3.4}	3	\N	\N	2025-12-15 07:00:00+07	2025-12-15 07:00:00+07	\N	\N	\N	\N
9650	overtime	1	{"date": "2025-12-25", "reason": "Xử lý công việc tồn đọng", "endTime": "18:56", "startTime": "17:00", "totalHours": 1.9}	3	\N	\N	2025-12-25 07:00:00+07	2025-12-25 07:00:00+07	\N	\N	\N	\N
9651	overtime	1	{"date": "2025-12-26", "reason": "Xử lý công việc tồn đọng", "endTime": "19:38", "startTime": "17:00", "totalHours": 2.6}	3	\N	\N	2025-12-26 07:00:00+07	2025-12-26 07:00:00+07	\N	\N	\N	\N
9652	overtime	1	{"date": "2025-12-30", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	3	\N	\N	2025-12-30 07:00:00+07	2025-12-30 07:00:00+07	\N	\N	\N	\N
9653	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:33", "startTime": "17:00", "totalHours": 2.6}	3	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9654	overtime	1	{"date": "2025-12-01", "reason": "Xử lý công việc tồn đọng", "endTime": "19:54", "startTime": "17:00", "totalHours": 2.9}	4	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
9655	overtime	1	{"date": "2025-12-08", "reason": "Xử lý công việc tồn đọng", "endTime": "19:22", "startTime": "17:00", "totalHours": 2.4}	4	\N	\N	2025-12-08 07:00:00+07	2025-12-08 07:00:00+07	\N	\N	\N	\N
9656	overtime	1	{"date": "2025-12-17", "reason": "Xử lý công việc tồn đọng", "endTime": "18:56", "startTime": "17:00", "totalHours": 1.9}	4	\N	\N	2025-12-17 07:00:00+07	2025-12-17 07:00:00+07	\N	\N	\N	\N
9657	overtime	1	{"date": "2025-12-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:20", "startTime": "17:00", "totalHours": 2.3}	5	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
9658	overtime	1	{"date": "2025-12-04", "reason": "Xử lý công việc tồn đọng", "endTime": "20:02", "startTime": "17:00", "totalHours": 3}	5	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
9659	overtime	1	{"date": "2025-12-09", "reason": "Xử lý công việc tồn đọng", "endTime": "18:46", "startTime": "17:00", "totalHours": 1.8}	5	\N	\N	2025-12-09 07:00:00+07	2025-12-09 07:00:00+07	\N	\N	\N	\N
9660	overtime	1	{"date": "2025-12-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:11", "startTime": "17:00", "totalHours": 2.2}	5	\N	\N	2025-12-15 07:00:00+07	2025-12-15 07:00:00+07	\N	\N	\N	\N
9661	overtime	1	{"date": "2025-12-18", "reason": "Xử lý công việc tồn đọng", "endTime": "19:40", "startTime": "17:00", "totalHours": 2.7}	5	\N	\N	2025-12-18 07:00:00+07	2025-12-18 07:00:00+07	\N	\N	\N	\N
9662	overtime	1	{"date": "2025-12-19", "reason": "Xử lý công việc tồn đọng", "endTime": "20:09", "startTime": "17:00", "totalHours": 3.2}	5	\N	\N	2025-12-19 07:00:00+07	2025-12-19 07:00:00+07	\N	\N	\N	\N
9663	overtime	1	{"date": "2025-12-20", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	5	\N	\N	2025-12-20 07:00:00+07	2025-12-20 07:00:00+07	\N	\N	\N	\N
9664	overtime	1	{"date": "2025-12-02", "reason": "Xử lý công việc tồn đọng", "endTime": "20:23", "startTime": "17:00", "totalHours": 3.4}	6	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
9665	overtime	1	{"date": "2025-12-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:39", "startTime": "17:00", "totalHours": 2.7}	6	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
9666	overtime	1	{"date": "2025-12-06", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	7	\N	\N	2025-12-06 07:00:00+07	2025-12-06 07:00:00+07	\N	\N	\N	\N
9667	overtime	1	{"date": "2025-12-12", "reason": "Xử lý công việc tồn đọng", "endTime": "18:59", "startTime": "17:00", "totalHours": 2}	7	\N	\N	2025-12-12 07:00:00+07	2025-12-12 07:00:00+07	\N	\N	\N	\N
9668	overtime	1	{"date": "2025-12-03", "reason": "Xử lý công việc tồn đọng", "endTime": "19:11", "startTime": "17:00", "totalHours": 2.2}	8	\N	\N	2025-12-03 07:00:00+07	2025-12-03 07:00:00+07	\N	\N	\N	\N
9669	overtime	1	{"date": "2025-12-13", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
9670	overtime	1	{"date": "2025-12-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
9671	overtime	1	{"date": "2025-12-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:36", "startTime": "17:00", "totalHours": 2.6}	9	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
9672	overtime	1	{"date": "2025-12-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:49", "startTime": "17:00", "totalHours": 2.8}	9	\N	\N	2025-12-15 07:00:00+07	2025-12-15 07:00:00+07	\N	\N	\N	\N
9673	overtime	1	{"date": "2025-12-27", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	9	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
9674	overtime	1	{"date": "2025-12-29", "reason": "Xử lý công việc tồn đọng", "endTime": "20:13", "startTime": "17:00", "totalHours": 3.2}	9	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
9675	overtime	1	{"date": "2025-12-27", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	10	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
9676	overtime	1	{"date": "2025-12-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
9677	overtime	1	{"date": "2025-12-01", "reason": "Xử lý công việc tồn đọng", "endTime": "18:38", "startTime": "17:00", "totalHours": 1.6}	12	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
9678	overtime	1	{"date": "2025-12-18", "reason": "Xử lý công việc tồn đọng", "endTime": "19:36", "startTime": "17:00", "totalHours": 2.6}	12	\N	\N	2025-12-18 07:00:00+07	2025-12-18 07:00:00+07	\N	\N	\N	\N
9679	overtime	1	{"date": "2025-12-10", "reason": "Xử lý công việc tồn đọng", "endTime": "18:52", "startTime": "17:00", "totalHours": 1.9}	13	\N	\N	2025-12-10 07:00:00+07	2025-12-10 07:00:00+07	\N	\N	\N	\N
9680	overtime	1	{"date": "2025-12-14", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	14	\N	\N	2025-12-14 07:00:00+07	2025-12-14 07:00:00+07	\N	\N	\N	\N
9681	overtime	1	{"date": "2025-12-27", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	14	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
9682	overtime	1	{"date": "2025-12-06", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2025-12-06 07:00:00+07	2025-12-06 07:00:00+07	\N	\N	\N	\N
9683	overtime	1	{"date": "2025-12-21", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
9684	overtime	1	{"date": "2025-12-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
9685	overtime	1	{"date": "2025-12-21", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
9686	overtime	1	{"date": "2025-12-22", "reason": "Xử lý công việc tồn đọng", "endTime": "19:56", "startTime": "17:00", "totalHours": 2.9}	16	\N	\N	2025-12-22 07:00:00+07	2025-12-22 07:00:00+07	\N	\N	\N	\N
9687	overtime	1	{"date": "2025-12-30", "reason": "Xử lý công việc tồn đọng", "endTime": "19:07", "startTime": "17:00", "totalHours": 2.1}	16	\N	\N	2025-12-30 07:00:00+07	2025-12-30 07:00:00+07	\N	\N	\N	\N
9688	overtime	1	{"date": "2025-12-03", "reason": "Xử lý công việc tồn đọng", "endTime": "18:57", "startTime": "17:00", "totalHours": 2}	17	\N	\N	2025-12-03 07:00:00+07	2025-12-03 07:00:00+07	\N	\N	\N	\N
9689	overtime	1	{"date": "2025-12-21", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
9690	overtime	1	{"date": "2025-12-06", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	18	\N	\N	2025-12-06 07:00:00+07	2025-12-06 07:00:00+07	\N	\N	\N	\N
9691	overtime	1	{"date": "2025-12-10", "reason": "Xử lý công việc tồn đọng", "endTime": "19:13", "startTime": "17:00", "totalHours": 2.2}	18	\N	\N	2025-12-10 07:00:00+07	2025-12-10 07:00:00+07	\N	\N	\N	\N
9692	overtime	1	{"date": "2025-12-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
9693	overtime	1	{"date": "2025-12-13", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
9694	overtime	1	{"date": "2025-12-19", "reason": "Xử lý công việc tồn đọng", "endTime": "19:07", "startTime": "17:00", "totalHours": 2.1}	19	\N	\N	2025-12-19 07:00:00+07	2025-12-19 07:00:00+07	\N	\N	\N	\N
9695	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "18:37", "startTime": "17:00", "totalHours": 1.6}	20	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9696	overtime	1	{"date": "2025-12-08", "reason": "Xử lý công việc tồn đọng", "endTime": "20:15", "startTime": "17:00", "totalHours": 3.3}	21	\N	\N	2025-12-08 07:00:00+07	2025-12-08 07:00:00+07	\N	\N	\N	\N
9697	overtime	1	{"date": "2025-12-16", "reason": "Xử lý công việc tồn đọng", "endTime": "19:44", "startTime": "17:00", "totalHours": 2.7}	21	\N	\N	2025-12-16 07:00:00+07	2025-12-16 07:00:00+07	\N	\N	\N	\N
9698	overtime	1	{"date": "2025-12-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:38", "startTime": "17:00", "totalHours": 2.6}	21	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
9699	overtime	1	{"date": "2025-12-27", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	22	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
9700	overtime	1	{"date": "2025-12-26", "reason": "Xử lý công việc tồn đọng", "endTime": "20:03", "startTime": "17:00", "totalHours": 3.1}	23	\N	\N	2025-12-26 07:00:00+07	2025-12-26 07:00:00+07	\N	\N	\N	\N
9701	overtime	1	{"date": "2025-12-03", "reason": "Xử lý công việc tồn đọng", "endTime": "18:58", "startTime": "17:00", "totalHours": 2}	24	\N	\N	2025-12-03 07:00:00+07	2025-12-03 07:00:00+07	\N	\N	\N	\N
9702	overtime	1	{"date": "2025-12-04", "reason": "Xử lý công việc tồn đọng", "endTime": "19:35", "startTime": "17:00", "totalHours": 2.6}	24	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
9703	overtime	1	{"date": "2025-12-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	24	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
9704	overtime	1	{"date": "2025-12-13", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	24	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
9705	overtime	1	{"date": "2025-12-21", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
9706	overtime	1	{"date": "2025-12-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:03", "startTime": "17:00", "totalHours": 2.1}	25	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
9707	overtime	1	{"date": "2025-12-29", "reason": "Xử lý công việc tồn đọng", "endTime": "20:01", "startTime": "17:00", "totalHours": 3}	25	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
9708	overtime	1	{"date": "2025-12-27", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	26	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
9709	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:10", "startTime": "17:00", "totalHours": 2.2}	26	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9710	overtime	1	{"date": "2025-12-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:01", "startTime": "17:00", "totalHours": 2}	27	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
9711	overtime	1	{"date": "2025-12-18", "reason": "Xử lý công việc tồn đọng", "endTime": "19:17", "startTime": "17:00", "totalHours": 2.3}	27	\N	\N	2025-12-18 07:00:00+07	2025-12-18 07:00:00+07	\N	\N	\N	\N
9712	overtime	1	{"date": "2025-12-20", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	27	\N	\N	2025-12-20 07:00:00+07	2025-12-20 07:00:00+07	\N	\N	\N	\N
9713	overtime	1	{"date": "2025-12-02", "reason": "Xử lý công việc tồn đọng", "endTime": "18:55", "startTime": "17:00", "totalHours": 1.9}	28	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
9714	overtime	1	{"date": "2025-12-14", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2025-12-14 07:00:00+07	2025-12-14 07:00:00+07	\N	\N	\N	\N
9715	overtime	1	{"date": "2025-12-01", "reason": "Xử lý công việc tồn đọng", "endTime": "18:30", "startTime": "17:00", "totalHours": 1.5}	30	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
9716	overtime	1	{"date": "2025-12-20", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2025-12-20 07:00:00+07	2025-12-20 07:00:00+07	\N	\N	\N	\N
9717	overtime	1	{"date": "2025-12-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:48", "startTime": "17:00", "totalHours": 2.8}	31	\N	\N	2025-12-05 07:00:00+07	2025-12-05 07:00:00+07	\N	\N	\N	\N
9718	overtime	1	{"date": "2025-12-19", "reason": "Xử lý công việc tồn đọng", "endTime": "20:09", "startTime": "17:00", "totalHours": 3.2}	31	\N	\N	2025-12-19 07:00:00+07	2025-12-19 07:00:00+07	\N	\N	\N	\N
9719	overtime	1	{"date": "2025-12-03", "reason": "Xử lý công việc tồn đọng", "endTime": "18:51", "startTime": "17:00", "totalHours": 1.9}	32	\N	\N	2025-12-03 07:00:00+07	2025-12-03 07:00:00+07	\N	\N	\N	\N
9720	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:14", "startTime": "17:00", "totalHours": 2.2}	32	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9721	overtime	1	{"date": "2025-12-14", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	33	\N	\N	2025-12-14 07:00:00+07	2025-12-14 07:00:00+07	\N	\N	\N	\N
9722	overtime	1	{"date": "2025-12-27", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	33	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
9723	overtime	1	{"date": "2025-12-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:35", "startTime": "17:00", "totalHours": 2.6}	34	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
9724	overtime	1	{"date": "2025-12-22", "reason": "Xử lý công việc tồn đọng", "endTime": "18:51", "startTime": "17:00", "totalHours": 1.9}	36	\N	\N	2025-12-22 07:00:00+07	2025-12-22 07:00:00+07	\N	\N	\N	\N
9725	overtime	1	{"date": "2025-12-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	36	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
9726	overtime	1	{"date": "2025-12-09", "reason": "Xử lý công việc tồn đọng", "endTime": "18:43", "startTime": "17:00", "totalHours": 1.7}	37	\N	\N	2025-12-09 07:00:00+07	2025-12-09 07:00:00+07	\N	\N	\N	\N
9727	overtime	1	{"date": "2025-12-14", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	37	\N	\N	2025-12-14 07:00:00+07	2025-12-14 07:00:00+07	\N	\N	\N	\N
9728	overtime	1	{"date": "2025-12-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:45", "startTime": "17:00", "totalHours": 2.8}	37	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
9729	overtime	1	{"date": "2025-12-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:28", "startTime": "17:00", "totalHours": 2.5}	37	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
9730	overtime	1	{"date": "2025-12-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:28", "startTime": "17:00", "totalHours": 2.5}	38	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
9731	overtime	1	{"date": "2025-12-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	38	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
9732	overtime	1	{"date": "2025-12-30", "reason": "Xử lý công việc tồn đọng", "endTime": "19:46", "startTime": "17:00", "totalHours": 2.8}	38	\N	\N	2025-12-30 07:00:00+07	2025-12-30 07:00:00+07	\N	\N	\N	\N
9733	overtime	1	{"date": "2025-12-19", "reason": "Xử lý công việc tồn đọng", "endTime": "19:18", "startTime": "17:00", "totalHours": 2.3}	39	\N	\N	2025-12-19 07:00:00+07	2025-12-19 07:00:00+07	\N	\N	\N	\N
9734	overtime	1	{"date": "2025-12-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	39	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
9735	overtime	1	{"date": "2025-12-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	40	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
9736	overtime	1	{"date": "2025-12-29", "reason": "Xử lý công việc tồn đọng", "endTime": "18:38", "startTime": "17:00", "totalHours": 1.6}	40	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
9737	overtime	1	{"date": "2025-12-20", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	41	\N	\N	2025-12-20 07:00:00+07	2025-12-20 07:00:00+07	\N	\N	\N	\N
9738	overtime	1	{"date": "2025-12-22", "reason": "Xử lý công việc tồn đọng", "endTime": "19:23", "startTime": "17:00", "totalHours": 2.4}	41	\N	\N	2025-12-22 07:00:00+07	2025-12-22 07:00:00+07	\N	\N	\N	\N
9739	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "18:39", "startTime": "17:00", "totalHours": 1.7}	41	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9740	overtime	1	{"date": "2025-12-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
9741	overtime	1	{"date": "2025-12-13", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
9742	overtime	1	{"date": "2025-12-21", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
9743	overtime	1	{"date": "2025-12-11", "reason": "Xử lý công việc tồn đọng", "endTime": "18:53", "startTime": "17:00", "totalHours": 1.9}	43	\N	\N	2025-12-11 07:00:00+07	2025-12-11 07:00:00+07	\N	\N	\N	\N
9744	overtime	1	{"date": "2025-12-14", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	43	\N	\N	2025-12-14 07:00:00+07	2025-12-14 07:00:00+07	\N	\N	\N	\N
9745	overtime	1	{"date": "2025-12-01", "reason": "Xử lý công việc tồn đọng", "endTime": "20:18", "startTime": "17:00", "totalHours": 3.3}	45	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
9746	overtime	1	{"date": "2025-12-17", "reason": "Xử lý công việc tồn đọng", "endTime": "19:12", "startTime": "17:00", "totalHours": 2.2}	45	\N	\N	2025-12-17 07:00:00+07	2025-12-17 07:00:00+07	\N	\N	\N	\N
9747	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "19:01", "startTime": "17:00", "totalHours": 2}	45	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9748	overtime	1	{"date": "2025-12-31", "reason": "Xử lý công việc tồn đọng", "endTime": "18:46", "startTime": "17:00", "totalHours": 1.8}	47	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
9749	overtime	1	{"date": "2025-12-27", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	48	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
9750	overtime	1	{"date": "2025-12-24", "reason": "Xử lý công việc tồn đọng", "endTime": "18:54", "startTime": "17:00", "totalHours": 1.9}	49	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
9751	overtime	1	{"date": "2025-12-16", "reason": "Xử lý công việc tồn đọng", "endTime": "19:14", "startTime": "17:00", "totalHours": 2.2}	50	\N	\N	2025-12-16 07:00:00+07	2025-12-16 07:00:00+07	\N	\N	\N	\N
9752	overtime	1	{"date": "2025-12-21", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	50	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
9753	overtime	1	{"date": "2026-01-02", "reason": "Xử lý công việc tồn đọng", "endTime": "20:15", "startTime": "17:00", "totalHours": 3.3}	1	\N	\N	2026-01-02 07:00:00+07	2026-01-02 07:00:00+07	\N	\N	\N	\N
9754	overtime	1	{"date": "2026-01-08", "reason": "Xử lý công việc tồn đọng", "endTime": "18:47", "startTime": "17:00", "totalHours": 1.8}	1	\N	\N	2026-01-08 07:00:00+07	2026-01-08 07:00:00+07	\N	\N	\N	\N
9755	overtime	1	{"date": "2026-01-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:51", "startTime": "17:00", "totalHours": 2.9}	1	\N	\N	2026-01-13 07:00:00+07	2026-01-13 07:00:00+07	\N	\N	\N	\N
9756	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:03", "startTime": "17:00", "totalHours": 2.1}	1	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9757	overtime	1	{"date": "2026-01-16", "reason": "Xử lý công việc tồn đọng", "endTime": "20:28", "startTime": "17:00", "totalHours": 3.5}	1	\N	\N	2026-01-16 07:00:00+07	2026-01-16 07:00:00+07	\N	\N	\N	\N
9758	overtime	1	{"date": "2026-01-19", "reason": "Xử lý công việc tồn đọng", "endTime": "19:03", "startTime": "17:00", "totalHours": 2.1}	1	\N	\N	2026-01-19 07:00:00+07	2026-01-19 07:00:00+07	\N	\N	\N	\N
9759	overtime	1	{"date": "2026-01-26", "reason": "Xử lý công việc tồn đọng", "endTime": "18:43", "startTime": "17:00", "totalHours": 1.7}	1	\N	\N	2026-01-26 07:00:00+07	2026-01-26 07:00:00+07	\N	\N	\N	\N
9760	overtime	1	{"date": "2026-01-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:31", "startTime": "17:00", "totalHours": 2.5}	1	\N	\N	2026-01-28 07:00:00+07	2026-01-28 07:00:00+07	\N	\N	\N	\N
9761	overtime	1	{"date": "2026-01-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	2	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
9762	overtime	1	{"date": "2026-01-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	2	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
9763	overtime	1	{"date": "2026-01-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:52", "startTime": "17:00", "totalHours": 2.9}	2	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
9764	overtime	1	{"date": "2026-01-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:59", "startTime": "17:00", "totalHours": 3}	2	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
9765	overtime	1	{"date": "2026-01-10", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	2	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
9766	overtime	1	{"date": "2026-01-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:20", "startTime": "17:00", "totalHours": 2.3}	2	\N	\N	2026-01-13 07:00:00+07	2026-01-13 07:00:00+07	\N	\N	\N	\N
9767	overtime	1	{"date": "2026-01-16", "reason": "Xử lý công việc tồn đọng", "endTime": "20:16", "startTime": "17:00", "totalHours": 3.3}	2	\N	\N	2026-01-16 07:00:00+07	2026-01-16 07:00:00+07	\N	\N	\N	\N
9768	overtime	1	{"date": "2026-01-22", "reason": "Xử lý công việc tồn đọng", "endTime": "19:10", "startTime": "17:00", "totalHours": 2.2}	2	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
9769	overtime	1	{"date": "2026-01-26", "reason": "Xử lý công việc tồn đọng", "endTime": "18:35", "startTime": "17:00", "totalHours": 1.6}	2	\N	\N	2026-01-26 07:00:00+07	2026-01-26 07:00:00+07	\N	\N	\N	\N
9770	overtime	1	{"date": "2026-01-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	2	\N	\N	2026-01-28 07:00:00+07	2026-01-28 07:00:00+07	\N	\N	\N	\N
9771	overtime	1	{"date": "2026-01-29", "reason": "Xử lý công việc tồn đọng", "endTime": "20:27", "startTime": "17:00", "totalHours": 3.5}	2	\N	\N	2026-01-29 07:00:00+07	2026-01-29 07:00:00+07	\N	\N	\N	\N
9772	overtime	1	{"date": "2026-01-30", "reason": "Xử lý công việc tồn đọng", "endTime": "20:08", "startTime": "17:00", "totalHours": 3.1}	2	\N	\N	2026-01-30 07:00:00+07	2026-01-30 07:00:00+07	\N	\N	\N	\N
9773	overtime	1	{"date": "2026-01-08", "reason": "Xử lý công việc tồn đọng", "endTime": "18:45", "startTime": "17:00", "totalHours": 1.8}	3	\N	\N	2026-01-08 07:00:00+07	2026-01-08 07:00:00+07	\N	\N	\N	\N
9774	overtime	1	{"date": "2026-01-12", "reason": "Xử lý công việc tồn đọng", "endTime": "19:15", "startTime": "17:00", "totalHours": 2.3}	3	\N	\N	2026-01-12 07:00:00+07	2026-01-12 07:00:00+07	\N	\N	\N	\N
9775	overtime	1	{"date": "2026-01-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:58", "startTime": "17:00", "totalHours": 3}	3	\N	\N	2026-01-13 07:00:00+07	2026-01-13 07:00:00+07	\N	\N	\N	\N
9776	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:08", "startTime": "17:00", "totalHours": 2.1}	3	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9777	overtime	1	{"date": "2026-01-21", "reason": "Xử lý công việc tồn đọng", "endTime": "20:15", "startTime": "17:00", "totalHours": 3.3}	3	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
9778	overtime	1	{"date": "2026-01-22", "reason": "Xử lý công việc tồn đọng", "endTime": "20:12", "startTime": "17:00", "totalHours": 3.2}	3	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
9779	overtime	1	{"date": "2026-01-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:08", "startTime": "17:00", "totalHours": 2.1}	3	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
9780	overtime	1	{"date": "2026-01-30", "reason": "Xử lý công việc tồn đọng", "endTime": "20:13", "startTime": "17:00", "totalHours": 3.2}	3	\N	\N	2026-01-30 07:00:00+07	2026-01-30 07:00:00+07	\N	\N	\N	\N
9781	overtime	1	{"date": "2026-01-01", "reason": "Trực lễ Tết Dương lịch 2026", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	4	\N	\N	2026-01-01 07:00:00+07	2026-01-01 07:00:00+07	\N	\N	\N	\N
9782	overtime	1	{"date": "2026-01-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:19", "startTime": "17:00", "totalHours": 2.3}	4	\N	\N	2026-01-02 07:00:00+07	2026-01-02 07:00:00+07	\N	\N	\N	\N
9783	overtime	1	{"date": "2026-01-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:09", "startTime": "17:00", "totalHours": 2.2}	4	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
9784	overtime	1	{"date": "2026-01-06", "reason": "Xử lý công việc tồn đọng", "endTime": "20:18", "startTime": "17:00", "totalHours": 3.3}	4	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
9785	overtime	1	{"date": "2026-01-08", "reason": "Xử lý công việc tồn đọng", "endTime": "18:50", "startTime": "17:00", "totalHours": 1.8}	4	\N	\N	2026-01-08 07:00:00+07	2026-01-08 07:00:00+07	\N	\N	\N	\N
9786	overtime	1	{"date": "2026-01-09", "reason": "Xử lý công việc tồn đọng", "endTime": "19:25", "startTime": "17:00", "totalHours": 2.4}	4	\N	\N	2026-01-09 07:00:00+07	2026-01-09 07:00:00+07	\N	\N	\N	\N
9787	overtime	1	{"date": "2026-01-22", "reason": "Xử lý công việc tồn đọng", "endTime": "18:55", "startTime": "17:00", "totalHours": 1.9}	4	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
9788	overtime	1	{"date": "2026-01-28", "reason": "Xử lý công việc tồn đọng", "endTime": "19:02", "startTime": "17:00", "totalHours": 2}	4	\N	\N	2026-01-28 07:00:00+07	2026-01-28 07:00:00+07	\N	\N	\N	\N
9789	overtime	1	{"date": "2026-01-29", "reason": "Xử lý công việc tồn đọng", "endTime": "19:55", "startTime": "17:00", "totalHours": 2.9}	4	\N	\N	2026-01-29 07:00:00+07	2026-01-29 07:00:00+07	\N	\N	\N	\N
9790	overtime	1	{"date": "2026-01-30", "reason": "Xử lý công việc tồn đọng", "endTime": "19:40", "startTime": "17:00", "totalHours": 2.7}	4	\N	\N	2026-01-30 07:00:00+07	2026-01-30 07:00:00+07	\N	\N	\N	\N
9791	overtime	1	{"date": "2026-01-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:16", "startTime": "17:00", "totalHours": 2.3}	5	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
9792	overtime	1	{"date": "2026-01-07", "reason": "Xử lý công việc tồn đọng", "endTime": "19:06", "startTime": "17:00", "totalHours": 2.1}	5	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
9793	overtime	1	{"date": "2026-01-09", "reason": "Xử lý công việc tồn đọng", "endTime": "20:22", "startTime": "17:00", "totalHours": 3.4}	5	\N	\N	2026-01-09 07:00:00+07	2026-01-09 07:00:00+07	\N	\N	\N	\N
9794	overtime	1	{"date": "2026-01-12", "reason": "Xử lý công việc tồn đọng", "endTime": "20:04", "startTime": "17:00", "totalHours": 3.1}	5	\N	\N	2026-01-12 07:00:00+07	2026-01-12 07:00:00+07	\N	\N	\N	\N
9795	overtime	1	{"date": "2026-01-19", "reason": "Xử lý công việc tồn đọng", "endTime": "19:42", "startTime": "17:00", "totalHours": 2.7}	5	\N	\N	2026-01-19 07:00:00+07	2026-01-19 07:00:00+07	\N	\N	\N	\N
9796	overtime	1	{"date": "2026-01-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	5	\N	\N	2026-01-25 07:00:00+07	2026-01-25 07:00:00+07	\N	\N	\N	\N
9797	overtime	1	{"date": "2026-01-02", "reason": "Xử lý công việc tồn đọng", "endTime": "18:38", "startTime": "17:00", "totalHours": 1.6}	6	\N	\N	2026-01-02 07:00:00+07	2026-01-02 07:00:00+07	\N	\N	\N	\N
9798	overtime	1	{"date": "2026-01-03", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
9799	overtime	1	{"date": "2026-01-07", "reason": "Xử lý công việc tồn đọng", "endTime": "20:05", "startTime": "17:00", "totalHours": 3.1}	6	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
9800	overtime	1	{"date": "2026-01-10", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
9801	overtime	1	{"date": "2026-01-28", "reason": "Xử lý công việc tồn đọng", "endTime": "20:08", "startTime": "17:00", "totalHours": 3.1}	6	\N	\N	2026-01-28 07:00:00+07	2026-01-28 07:00:00+07	\N	\N	\N	\N
9802	overtime	1	{"date": "2026-01-29", "reason": "Xử lý công việc tồn đọng", "endTime": "19:38", "startTime": "17:00", "totalHours": 2.6}	7	\N	\N	2026-01-29 07:00:00+07	2026-01-29 07:00:00+07	\N	\N	\N	\N
9803	overtime	1	{"date": "2026-01-31", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	7	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
9804	overtime	1	{"date": "2026-01-06", "reason": "Xử lý công việc tồn đọng", "endTime": "18:35", "startTime": "17:00", "totalHours": 1.6}	8	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
9805	overtime	1	{"date": "2026-01-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:19", "startTime": "17:00", "totalHours": 2.3}	9	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
9806	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:25", "startTime": "17:00", "totalHours": 2.4}	9	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9807	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:49", "startTime": "17:00", "totalHours": 2.8}	12	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9808	overtime	1	{"date": "2026-01-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
9809	overtime	1	{"date": "2026-01-23", "reason": "Xử lý công việc tồn đọng", "endTime": "19:07", "startTime": "17:00", "totalHours": 2.1}	12	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
9810	overtime	1	{"date": "2026-01-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2026-01-25 07:00:00+07	2026-01-25 07:00:00+07	\N	\N	\N	\N
9811	overtime	1	{"date": "2026-01-03", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	13	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
9812	overtime	1	{"date": "2026-01-10", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	13	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
9813	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:05", "startTime": "17:00", "totalHours": 2.1}	13	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9814	overtime	1	{"date": "2026-01-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	13	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
9815	overtime	1	{"date": "2026-01-16", "reason": "Xử lý công việc tồn đọng", "endTime": "19:28", "startTime": "17:00", "totalHours": 2.5}	14	\N	\N	2026-01-16 07:00:00+07	2026-01-16 07:00:00+07	\N	\N	\N	\N
9816	overtime	1	{"date": "2026-01-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	14	\N	\N	2026-01-25 07:00:00+07	2026-01-25 07:00:00+07	\N	\N	\N	\N
9817	overtime	1	{"date": "2026-01-03", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
9818	overtime	1	{"date": "2026-01-14", "reason": "Xử lý công việc tồn đọng", "endTime": "19:13", "startTime": "17:00", "totalHours": 2.2}	15	\N	\N	2026-01-14 07:00:00+07	2026-01-14 07:00:00+07	\N	\N	\N	\N
9819	overtime	1	{"date": "2026-01-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
9820	overtime	1	{"date": "2026-01-14", "reason": "Xử lý công việc tồn đọng", "endTime": "18:36", "startTime": "17:00", "totalHours": 1.6}	16	\N	\N	2026-01-14 07:00:00+07	2026-01-14 07:00:00+07	\N	\N	\N	\N
9821	overtime	1	{"date": "2026-01-03", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
9822	overtime	1	{"date": "2026-01-17", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
9823	overtime	1	{"date": "2026-01-27", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	17	\N	\N	2026-01-27 07:00:00+07	2026-01-27 07:00:00+07	\N	\N	\N	\N
9824	overtime	1	{"date": "2026-01-01", "reason": "Trực lễ Tết Dương lịch 2026", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	18	\N	\N	2026-01-01 07:00:00+07	2026-01-01 07:00:00+07	\N	\N	\N	\N
9825	overtime	1	{"date": "2026-01-06", "reason": "Xử lý công việc tồn đọng", "endTime": "20:28", "startTime": "17:00", "totalHours": 3.5}	19	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
9826	overtime	1	{"date": "2026-01-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:08", "startTime": "17:00", "totalHours": 2.1}	19	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
9827	overtime	1	{"date": "2026-01-28", "reason": "Xử lý công việc tồn đọng", "endTime": "20:24", "startTime": "17:00", "totalHours": 3.4}	19	\N	\N	2026-01-28 07:00:00+07	2026-01-28 07:00:00+07	\N	\N	\N	\N
9828	overtime	1	{"date": "2026-01-03", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
9829	overtime	1	{"date": "2026-01-06", "reason": "Xử lý công việc tồn đọng", "endTime": "18:33", "startTime": "17:00", "totalHours": 1.6}	20	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
9830	overtime	1	{"date": "2026-01-09", "reason": "Xử lý công việc tồn đọng", "endTime": "18:49", "startTime": "17:00", "totalHours": 1.8}	20	\N	\N	2026-01-09 07:00:00+07	2026-01-09 07:00:00+07	\N	\N	\N	\N
9831	overtime	1	{"date": "2026-01-17", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
9832	overtime	1	{"date": "2026-01-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
9833	overtime	1	{"date": "2026-01-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:58", "startTime": "17:00", "totalHours": 3}	20	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
9834	overtime	1	{"date": "2026-01-07", "reason": "Xử lý công việc tồn đọng", "endTime": "20:17", "startTime": "17:00", "totalHours": 3.3}	21	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
9835	overtime	1	{"date": "2026-01-17", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	21	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
9836	overtime	1	{"date": "2026-01-03", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	22	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
9837	overtime	1	{"date": "2026-01-19", "reason": "Xử lý công việc tồn đọng", "endTime": "19:08", "startTime": "17:00", "totalHours": 2.1}	22	\N	\N	2026-01-19 07:00:00+07	2026-01-19 07:00:00+07	\N	\N	\N	\N
9838	overtime	1	{"date": "2026-01-11", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
9839	overtime	1	{"date": "2026-01-17", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
9840	overtime	1	{"date": "2026-01-26", "reason": "Xử lý công việc tồn đọng", "endTime": "18:45", "startTime": "17:00", "totalHours": 1.8}	25	\N	\N	2026-01-26 07:00:00+07	2026-01-26 07:00:00+07	\N	\N	\N	\N
9841	overtime	1	{"date": "2026-01-27", "reason": "Xử lý công việc tồn đọng", "endTime": "20:05", "startTime": "17:00", "totalHours": 3.1}	25	\N	\N	2026-01-27 07:00:00+07	2026-01-27 07:00:00+07	\N	\N	\N	\N
9842	overtime	1	{"date": "2026-01-07", "reason": "Xử lý công việc tồn đọng", "endTime": "20:01", "startTime": "17:00", "totalHours": 3}	26	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
9843	overtime	1	{"date": "2026-01-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	27	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
9844	overtime	1	{"date": "2026-01-16", "reason": "Xử lý công việc tồn đọng", "endTime": "19:35", "startTime": "17:00", "totalHours": 2.6}	28	\N	\N	2026-01-16 07:00:00+07	2026-01-16 07:00:00+07	\N	\N	\N	\N
9845	overtime	1	{"date": "2026-01-03", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
9846	overtime	1	{"date": "2026-01-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
9847	overtime	1	{"date": "2026-01-22", "reason": "Xử lý công việc tồn đọng", "endTime": "20:08", "startTime": "17:00", "totalHours": 3.1}	29	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
9848	overtime	1	{"date": "2026-01-27", "reason": "Xử lý công việc tồn đọng", "endTime": "19:19", "startTime": "17:00", "totalHours": 2.3}	30	\N	\N	2026-01-27 07:00:00+07	2026-01-27 07:00:00+07	\N	\N	\N	\N
9849	overtime	1	{"date": "2026-01-31", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
9850	overtime	1	{"date": "2026-01-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
9851	overtime	1	{"date": "2026-01-11", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
9852	overtime	1	{"date": "2026-01-12", "reason": "Xử lý công việc tồn đọng", "endTime": "20:26", "startTime": "17:00", "totalHours": 3.4}	31	\N	\N	2026-01-12 07:00:00+07	2026-01-12 07:00:00+07	\N	\N	\N	\N
9853	overtime	1	{"date": "2026-01-22", "reason": "Xử lý công việc tồn đọng", "endTime": "19:18", "startTime": "17:00", "totalHours": 2.3}	31	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
9854	overtime	1	{"date": "2026-01-24", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
9855	overtime	1	{"date": "2026-01-29", "reason": "Xử lý công việc tồn đọng", "endTime": "18:50", "startTime": "17:00", "totalHours": 1.8}	31	\N	\N	2026-01-29 07:00:00+07	2026-01-29 07:00:00+07	\N	\N	\N	\N
9856	overtime	1	{"date": "2026-01-10", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	32	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
9857	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "20:11", "startTime": "17:00", "totalHours": 3.2}	33	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9858	overtime	1	{"date": "2026-01-17", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	33	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
9859	overtime	1	{"date": "2026-01-31", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	33	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
9860	overtime	1	{"date": "2026-01-11", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	34	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
9861	overtime	1	{"date": "2026-01-01", "reason": "Trực lễ Tết Dương lịch 2026", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	35	\N	\N	2026-01-01 07:00:00+07	2026-01-01 07:00:00+07	\N	\N	\N	\N
9862	overtime	1	{"date": "2026-01-14", "reason": "Xử lý công việc tồn đọng", "endTime": "20:00", "startTime": "17:00", "totalHours": 3}	36	\N	\N	2026-01-14 07:00:00+07	2026-01-14 07:00:00+07	\N	\N	\N	\N
9863	overtime	1	{"date": "2026-01-23", "reason": "Xử lý công việc tồn đọng", "endTime": "20:22", "startTime": "17:00", "totalHours": 3.4}	36	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
9864	overtime	1	{"date": "2026-01-27", "reason": "Xử lý công việc tồn đọng", "endTime": "19:52", "startTime": "17:00", "totalHours": 2.9}	36	\N	\N	2026-01-27 07:00:00+07	2026-01-27 07:00:00+07	\N	\N	\N	\N
9865	overtime	1	{"date": "2026-01-09", "reason": "Xử lý công việc tồn đọng", "endTime": "20:17", "startTime": "17:00", "totalHours": 3.3}	37	\N	\N	2026-01-09 07:00:00+07	2026-01-09 07:00:00+07	\N	\N	\N	\N
9866	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:01", "startTime": "17:00", "totalHours": 2}	37	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9867	overtime	1	{"date": "2026-01-21", "reason": "Xử lý công việc tồn đọng", "endTime": "20:02", "startTime": "17:00", "totalHours": 3}	37	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
9868	overtime	1	{"date": "2026-01-22", "reason": "Xử lý công việc tồn đọng", "endTime": "19:44", "startTime": "17:00", "totalHours": 2.7}	37	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
9869	overtime	1	{"date": "2026-01-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	38	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
9870	overtime	1	{"date": "2026-01-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:24", "startTime": "17:00", "totalHours": 2.4}	38	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
9871	overtime	1	{"date": "2026-01-24", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	38	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
9872	overtime	1	{"date": "2026-01-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	38	\N	\N	2026-01-25 07:00:00+07	2026-01-25 07:00:00+07	\N	\N	\N	\N
9873	overtime	1	{"date": "2026-01-28", "reason": "Xử lý công việc tồn đọng", "endTime": "18:31", "startTime": "17:00", "totalHours": 1.5}	38	\N	\N	2026-01-28 07:00:00+07	2026-01-28 07:00:00+07	\N	\N	\N	\N
9874	overtime	1	{"date": "2026-01-29", "reason": "Xử lý công việc tồn đọng", "endTime": "18:36", "startTime": "17:00", "totalHours": 1.6}	38	\N	\N	2026-01-29 07:00:00+07	2026-01-29 07:00:00+07	\N	\N	\N	\N
9875	overtime	1	{"date": "2026-01-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	39	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
9876	overtime	1	{"date": "2026-01-27", "reason": "Xử lý công việc tồn đọng", "endTime": "18:33", "startTime": "17:00", "totalHours": 1.6}	39	\N	\N	2026-01-27 07:00:00+07	2026-01-27 07:00:00+07	\N	\N	\N	\N
9877	overtime	1	{"date": "2026-01-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	40	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
9878	overtime	1	{"date": "2026-01-23", "reason": "Xử lý công việc tồn đọng", "endTime": "18:58", "startTime": "17:00", "totalHours": 2}	40	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
9879	overtime	1	{"date": "2026-01-18", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	41	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
9880	overtime	1	{"date": "2026-01-28", "reason": "Xử lý công việc tồn đọng", "endTime": "20:18", "startTime": "17:00", "totalHours": 3.3}	41	\N	\N	2026-01-28 07:00:00+07	2026-01-28 07:00:00+07	\N	\N	\N	\N
9881	overtime	1	{"date": "2026-01-10", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
9882	overtime	1	{"date": "2026-01-21", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	42	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
9883	overtime	1	{"date": "2026-01-14", "reason": "Xử lý công việc tồn đọng", "endTime": "20:18", "startTime": "17:00", "totalHours": 3.3}	43	\N	\N	2026-01-14 07:00:00+07	2026-01-14 07:00:00+07	\N	\N	\N	\N
9884	overtime	1	{"date": "2026-01-20", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	43	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
9885	overtime	1	{"date": "2026-01-23", "reason": "Xử lý công việc tồn đọng", "endTime": "20:21", "startTime": "17:00", "totalHours": 3.4}	44	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
9886	overtime	1	{"date": "2026-01-26", "reason": "Xử lý công việc tồn đọng", "endTime": "19:30", "startTime": "17:00", "totalHours": 2.5}	44	\N	\N	2026-01-26 07:00:00+07	2026-01-26 07:00:00+07	\N	\N	\N	\N
9887	overtime	1	{"date": "2026-01-31", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	44	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
9888	overtime	1	{"date": "2026-01-24", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	45	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
9889	overtime	1	{"date": "2026-01-30", "reason": "Xử lý công việc tồn đọng", "endTime": "18:41", "startTime": "17:00", "totalHours": 1.7}	45	\N	\N	2026-01-30 07:00:00+07	2026-01-30 07:00:00+07	\N	\N	\N	\N
9890	overtime	1	{"date": "2026-01-04", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	46	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
9891	overtime	1	{"date": "2026-01-21", "reason": "Xử lý công việc tồn đọng", "endTime": "20:24", "startTime": "17:00", "totalHours": 3.4}	46	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
9892	overtime	1	{"date": "2026-01-06", "reason": "Xử lý công việc tồn đọng", "endTime": "18:53", "startTime": "17:00", "totalHours": 1.9}	47	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
9893	overtime	1	{"date": "2026-01-10", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	48	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
9894	overtime	1	{"date": "2026-01-01", "reason": "Trực lễ Tết Dương lịch 2026", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	49	\N	\N	2026-01-01 07:00:00+07	2026-01-01 07:00:00+07	\N	\N	\N	\N
9895	overtime	1	{"date": "2026-01-11", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	49	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
9896	overtime	1	{"date": "2026-01-17", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	49	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
9897	overtime	1	{"date": "2026-01-29", "reason": "Xử lý công việc tồn đọng", "endTime": "20:20", "startTime": "17:00", "totalHours": 3.3}	49	\N	\N	2026-01-29 07:00:00+07	2026-01-29 07:00:00+07	\N	\N	\N	\N
9898	overtime	1	{"date": "2026-01-15", "reason": "Xử lý công việc tồn đọng", "endTime": "19:28", "startTime": "17:00", "totalHours": 2.5}	50	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
9899	overtime	1	{"date": "2026-01-17", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	50	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
9900	overtime	1	{"date": "2026-01-25", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	50	\N	\N	2026-01-25 07:00:00+07	2026-01-25 07:00:00+07	\N	\N	\N	\N
9901	overtime	1	{"date": "2026-02-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:50", "startTime": "17:00", "totalHours": 2.8}	1	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
9902	overtime	1	{"date": "2026-02-03", "reason": "Xử lý công việc tồn đọng", "endTime": "18:52", "startTime": "17:00", "totalHours": 1.9}	1	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
9903	overtime	1	{"date": "2026-02-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:22", "startTime": "17:00", "totalHours": 2.4}	1	\N	\N	2026-02-05 07:00:00+07	2026-02-05 07:00:00+07	\N	\N	\N	\N
9904	overtime	1	{"date": "2026-02-12", "reason": "Xử lý công việc tồn đọng", "endTime": "18:47", "startTime": "17:00", "totalHours": 1.8}	1	\N	\N	2026-02-12 07:00:00+07	2026-02-12 07:00:00+07	\N	\N	\N	\N
9905	overtime	1	{"date": "2026-02-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:49", "startTime": "17:00", "totalHours": 2.8}	1	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
9906	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
9907	overtime	1	{"date": "2026-02-18", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
9908	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9909	overtime	1	{"date": "2026-02-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	1	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
9910	overtime	1	{"date": "2026-02-03", "reason": "Xử lý công việc tồn đọng", "endTime": "19:28", "startTime": "17:00", "totalHours": 2.5}	2	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
9911	overtime	1	{"date": "2026-02-04", "reason": "Xử lý công việc tồn đọng", "endTime": "18:44", "startTime": "17:00", "totalHours": 1.7}	2	\N	\N	2026-02-04 07:00:00+07	2026-02-04 07:00:00+07	\N	\N	\N	\N
9912	overtime	1	{"date": "2026-02-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:59", "startTime": "17:00", "totalHours": 3}	2	\N	\N	2026-02-06 07:00:00+07	2026-02-06 07:00:00+07	\N	\N	\N	\N
9913	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	2	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9914	overtime	1	{"date": "2026-02-26", "reason": "Xử lý công việc tồn đọng", "endTime": "19:05", "startTime": "17:00", "totalHours": 2.1}	2	\N	\N	2026-02-26 07:00:00+07	2026-02-26 07:00:00+07	\N	\N	\N	\N
9915	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	3	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
9916	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	3	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
9917	overtime	1	{"date": "2026-02-25", "reason": "Xử lý công việc tồn đọng", "endTime": "18:50", "startTime": "17:00", "totalHours": 1.8}	3	\N	\N	2026-02-25 07:00:00+07	2026-02-25 07:00:00+07	\N	\N	\N	\N
9918	overtime	1	{"date": "2026-02-09", "reason": "Xử lý công việc tồn đọng", "endTime": "18:36", "startTime": "17:00", "totalHours": 1.6}	4	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
9919	overtime	1	{"date": "2026-02-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:47", "startTime": "17:00", "totalHours": 2.8}	4	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
9920	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	4	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
9921	overtime	1	{"date": "2026-02-09", "reason": "Xử lý công việc tồn đọng", "endTime": "18:49", "startTime": "17:00", "totalHours": 1.8}	5	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
9922	overtime	1	{"date": "2026-02-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:46", "startTime": "17:00", "totalHours": 2.8}	5	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
9923	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	5	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
9924	overtime	1	{"date": "2026-02-23", "reason": "Xử lý công việc tồn đọng", "endTime": "20:24", "startTime": "17:00", "totalHours": 3.4}	5	\N	\N	2026-02-23 07:00:00+07	2026-02-23 07:00:00+07	\N	\N	\N	\N
9925	overtime	1	{"date": "2026-02-24", "reason": "Xử lý công việc tồn đọng", "endTime": "18:57", "startTime": "17:00", "totalHours": 2}	5	\N	\N	2026-02-24 07:00:00+07	2026-02-24 07:00:00+07	\N	\N	\N	\N
9926	overtime	1	{"date": "2026-02-02", "reason": "Xử lý công việc tồn đọng", "endTime": "20:25", "startTime": "17:00", "totalHours": 3.4}	6	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
9927	overtime	1	{"date": "2026-02-03", "reason": "Xử lý công việc tồn đọng", "endTime": "20:06", "startTime": "17:00", "totalHours": 3.1}	6	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
9928	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9929	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
9930	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
9931	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
9932	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	6	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9933	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	7	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
9934	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9935	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
9936	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	8	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9937	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	9	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9938	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	9	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9939	overtime	1	{"date": "2026-02-04", "reason": "Xử lý công việc tồn đọng", "endTime": "20:18", "startTime": "17:00", "totalHours": 3.3}	10	\N	\N	2026-02-04 07:00:00+07	2026-02-04 07:00:00+07	\N	\N	\N	\N
9940	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	10	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
9941	overtime	1	{"date": "2026-02-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	10	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
9942	overtime	1	{"date": "2026-02-11", "reason": "Trực lễ test", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
9943	overtime	1	{"date": "2026-02-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:45", "startTime": "17:00", "totalHours": 2.8}	11	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
9944	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9945	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
9946	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	11	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9947	overtime	1	{"date": "2026-02-12", "reason": "Xử lý công việc tồn đọng", "endTime": "19:36", "startTime": "17:00", "totalHours": 2.6}	12	\N	\N	2026-02-12 07:00:00+07	2026-02-12 07:00:00+07	\N	\N	\N	\N
9948	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9949	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
9950	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	12	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9951	overtime	1	{"date": "2026-02-23", "reason": "Xử lý công việc tồn đọng", "endTime": "18:41", "startTime": "17:00", "totalHours": 1.7}	12	\N	\N	2026-02-23 07:00:00+07	2026-02-23 07:00:00+07	\N	\N	\N	\N
9952	overtime	1	{"date": "2026-02-02", "reason": "Xử lý công việc tồn đọng", "endTime": "19:05", "startTime": "17:00", "totalHours": 2.1}	13	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
9953	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	13	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
9954	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	15	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
9955	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
9956	overtime	1	{"date": "2026-02-18", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
9957	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	16	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9958	overtime	1	{"date": "2026-02-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2026-02-07 07:00:00+07	2026-02-07 07:00:00+07	\N	\N	\N	\N
9959	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9960	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
9961	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	17	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9962	overtime	1	{"date": "2026-02-26", "reason": "Xử lý công việc tồn đọng", "endTime": "18:41", "startTime": "17:00", "totalHours": 1.7}	17	\N	\N	2026-02-26 07:00:00+07	2026-02-26 07:00:00+07	\N	\N	\N	\N
10071	leave	0	{"reason": "Không", "endDate": "2026-03-09T17:00:00.000Z", "leaveType": "personal", "startDate": "2026-03-09T17:00:00.000Z", "applicationCategory": "regular"}	2	\N	\N	2026-02-12 09:41:02.203136+07	2026-02-12 09:41:02.203136+07	\N	\N	\N	\N
9963	overtime	1	{"date": "2026-02-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	18	\N	\N	2026-02-07 07:00:00+07	2026-02-07 07:00:00+07	\N	\N	\N	\N
9964	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	18	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9965	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	18	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
9966	overtime	1	{"date": "2026-02-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	18	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
9967	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9968	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	19	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9969	overtime	1	{"date": "2026-02-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:53", "startTime": "17:00", "totalHours": 2.9}	20	\N	\N	2026-02-06 07:00:00+07	2026-02-06 07:00:00+07	\N	\N	\N	\N
9970	overtime	1	{"date": "2026-02-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
9971	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
9972	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	20	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9973	overtime	1	{"date": "2026-02-24", "reason": "Xử lý công việc tồn đọng", "endTime": "18:33", "startTime": "17:00", "totalHours": 1.6}	20	\N	\N	2026-02-24 07:00:00+07	2026-02-24 07:00:00+07	\N	\N	\N	\N
9974	overtime	1	{"date": "2026-02-04", "reason": "Xử lý công việc tồn đọng", "endTime": "19:42", "startTime": "17:00", "totalHours": 2.7}	21	\N	\N	2026-02-04 07:00:00+07	2026-02-04 07:00:00+07	\N	\N	\N	\N
9975	overtime	1	{"date": "2026-02-07", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	21	\N	\N	2026-02-07 07:00:00+07	2026-02-07 07:00:00+07	\N	\N	\N	\N
9976	overtime	1	{"date": "2026-02-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	21	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
9977	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	21	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
9978	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	21	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9979	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	22	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
9980	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
9981	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
9982	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
9983	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9984	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	23	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
9985	overtime	1	{"date": "2026-02-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	24	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
9986	overtime	1	{"date": "2026-02-11", "reason": "Trực lễ test", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	24	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
9987	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	24	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
9988	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	24	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9989	overtime	1	{"date": "2026-02-28", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	24	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
9990	overtime	1	{"date": "2026-02-01", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
9991	overtime	1	{"date": "2026-02-18", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
9992	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	25	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
9993	overtime	1	{"date": "2026-02-24", "reason": "Xử lý công việc tồn đọng", "endTime": "19:30", "startTime": "17:00", "totalHours": 2.5}	25	\N	\N	2026-02-24 07:00:00+07	2026-02-24 07:00:00+07	\N	\N	\N	\N
9994	overtime	1	{"date": "2026-02-11", "reason": "Trực lễ test", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	26	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
9995	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	26	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
9996	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	26	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
9997	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	26	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
9998	overtime	1	{"date": "2026-02-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	27	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
9999	overtime	1	{"date": "2026-02-01", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	28	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10000	overtime	1	{"date": "2026-02-03", "reason": "Xử lý công việc tồn đọng", "endTime": "20:06", "startTime": "17:00", "totalHours": 3.1}	28	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
10001	overtime	1	{"date": "2026-02-11", "reason": "Trực lễ test", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	28	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
10002	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	28	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10003	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	28	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10004	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	28	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10005	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	28	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10006	overtime	1	{"date": "2026-02-23", "reason": "Xử lý công việc tồn đọng", "endTime": "18:56", "startTime": "17:00", "totalHours": 1.9}	28	\N	\N	2026-02-23 07:00:00+07	2026-02-23 07:00:00+07	\N	\N	\N	\N
10007	overtime	1	{"date": "2026-02-05", "reason": "Xử lý công việc tồn đọng", "endTime": "19:09", "startTime": "17:00", "totalHours": 2.2}	29	\N	\N	2026-02-05 07:00:00+07	2026-02-05 07:00:00+07	\N	\N	\N	\N
10008	overtime	1	{"date": "2026-02-09", "reason": "Xử lý công việc tồn đọng", "endTime": "19:31", "startTime": "17:00", "totalHours": 2.5}	29	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10009	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10010	overtime	1	{"date": "2026-02-18", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
10011	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	29	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10012	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10013	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	30	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10014	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10015	overtime	1	{"date": "2026-02-18", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	31	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
10016	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	32	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10017	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	34	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10018	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	34	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10019	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	35	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10020	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	35	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10021	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	35	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10022	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	36	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
10023	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	36	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10024	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	36	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10025	overtime	1	{"date": "2026-02-09", "reason": "Xử lý công việc tồn đọng", "endTime": "19:29", "startTime": "17:00", "totalHours": 2.5}	37	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10026	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	37	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10027	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	37	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10028	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	37	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10029	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	37	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10030	overtime	1	{"date": "2026-02-05", "reason": "Xử lý công việc tồn đọng", "endTime": "20:12", "startTime": "17:00", "totalHours": 3.2}	39	\N	\N	2026-02-05 07:00:00+07	2026-02-05 07:00:00+07	\N	\N	\N	\N
10031	overtime	1	{"date": "2026-02-13", "reason": "Xử lý công việc tồn đọng", "endTime": "19:04", "startTime": "17:00", "totalHours": 2.1}	39	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10032	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	39	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10033	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	39	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10034	overtime	1	{"date": "2026-02-27", "reason": "Xử lý công việc tồn đọng", "endTime": "19:56", "startTime": "17:00", "totalHours": 2.9}	39	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10035	overtime	1	{"date": "2026-02-11", "reason": "Trực lễ test", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	40	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
10036	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	40	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10037	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	40	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10038	overtime	1	{"date": "2026-02-06", "reason": "Xử lý công việc tồn đọng", "endTime": "19:04", "startTime": "17:00", "totalHours": 2.1}	41	\N	\N	2026-02-06 07:00:00+07	2026-02-06 07:00:00+07	\N	\N	\N	\N
10039	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	41	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10040	overtime	1	{"date": "2026-02-22", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	41	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10041	overtime	1	{"date": "2026-02-27", "reason": "Xử lý công việc tồn đọng", "endTime": "20:23", "startTime": "17:00", "totalHours": 3.4}	41	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10042	overtime	1	{"date": "2026-02-18", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
10043	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	42	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10044	overtime	1	{"date": "2026-02-27", "reason": "Xử lý công việc tồn đọng", "endTime": "18:47", "startTime": "17:00", "totalHours": 1.8}	42	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10045	overtime	1	{"date": "2026-02-10", "reason": "Xử lý công việc tồn đọng", "endTime": "19:03", "startTime": "17:00", "totalHours": 2.1}	43	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10046	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	43	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10047	overtime	1	{"date": "2026-02-25", "reason": "Xử lý công việc tồn đọng", "endTime": "19:52", "startTime": "17:00", "totalHours": 2.9}	43	\N	\N	2026-02-25 07:00:00+07	2026-02-25 07:00:00+07	\N	\N	\N	\N
10048	overtime	1	{"date": "2026-02-17", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	44	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10049	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	44	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
8638	business-trip	1	{"reason": "Họp đối tác chiến lược", "endTime": "2026-02-20 17:00", "startTime": "2026-02-18 08:00", "destination": "Hồ Chí Minh", "contactPerson": "Mr. A"}	1	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10072	business-trip	0	{"endDate": "2026-03-24", "purpose": "Không", "startDate": "2026-03-23", "destination": "Cao Bằng", "estimatedCost": 5000000}	2	\N	\N	2026-02-12 09:41:27.310055+07	2026-02-12 09:41:27.310055+07	\N	\N	\N	\N
10735	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-16", "leaveType": "unpaid", "startDate": "2026-01-16"}	50	\N	\N	2026-01-16 07:00:00+07	2026-01-16 07:00:00+07	\N	\N	\N	\N
10736	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-26", "leaveType": "unpaid", "startDate": "2025-12-26"}	50	\N	\N	2025-12-26 07:00:00+07	2025-12-26 07:00:00+07	\N	\N	\N	\N
10737	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-24", "leaveType": "unpaid", "startDate": "2025-10-24"}	50	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
10738	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-10", "leaveType": "unpaid", "startDate": "2026-02-10"}	50	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10739	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-04", "leaveType": "unpaid", "startDate": "2026-01-04"}	50	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
10073	leave	0	{"isPaid": true, "reason": "Nghỉ việc riêng", "endDate": "2026-02-13", "leaveType": "annual", "startDate": "2026-02-13"}	2	\N	\N	2026-02-12 09:41:02+07	2026-02-12 09:41:02+07	\N	\N	\N	\N
10074	business-trip	0	{"reason": "Khảo sát thị trường", "endDate": "2026-03-24", "location": "Hồ Chí Minh", "startDate": "2026-03-20", "destination": "Hồ Chí Minh"}	2	\N	\N	2026-02-12 09:41:27+07	2026-02-12 09:41:27+07	\N	\N	\N	\N
10176	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-25", "leaveType": "unpaid", "startDate": "2026-02-25"}	2	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10228	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-01", "leaveType": "unpaid", "startDate": "2026-02-01"}	1	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10263	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-29", "leaveType": "unpaid", "startDate": "2025-11-29"}	4	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
10298	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-13", "leaveType": "unpaid", "startDate": "2025-11-13"}	7	\N	\N	2025-11-13 07:00:00+07	2025-11-13 07:00:00+07	\N	\N	\N	\N
10333	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-28", "leaveType": "unpaid", "startDate": "2025-12-28"}	11	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
10369	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-23", "leaveType": "unpaid", "startDate": "2025-10-23"}	15	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
10405	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-30", "leaveType": "unpaid", "startDate": "2025-12-30"}	18	\N	\N	2025-12-30 07:00:00+07	2025-12-30 07:00:00+07	\N	\N	\N	\N
10439	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-12", "leaveType": "unpaid", "startDate": "2026-01-12"}	22	\N	\N	2026-01-12 07:00:00+07	2026-01-12 07:00:00+07	\N	\N	\N	\N
10475	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-08", "leaveType": "unpaid", "startDate": "2025-11-08"}	25	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
10510	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-12", "leaveType": "unpaid", "startDate": "2025-11-12"}	28	\N	\N	2025-11-12 07:00:00+07	2025-11-12 07:00:00+07	\N	\N	\N	\N
10545	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-28", "leaveType": "unpaid", "startDate": "2025-10-28"}	32	\N	\N	2025-10-28 07:00:00+07	2025-10-28 07:00:00+07	\N	\N	\N	\N
10583	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-11", "leaveType": "unpaid", "startDate": "2025-12-11"}	36	\N	\N	2025-12-11 07:00:00+07	2025-12-11 07:00:00+07	\N	\N	\N	\N
10617	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-10", "leaveType": "unpaid", "startDate": "2026-02-10"}	39	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10651	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-12", "leaveType": "unpaid", "startDate": "2025-12-12"}	42	\N	\N	2025-12-12 07:00:00+07	2025-12-12 07:00:00+07	\N	\N	\N	\N
10688	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-17", "leaveType": "unpaid", "startDate": "2026-02-17"}	45	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10075	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-11", "leaveType": "annual", "startDate": "2026-02-11"}	1	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10076	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-13", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-11", "destination": "Chi nhánh Tỉnh"}	1	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10077	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-12", "leaveType": "annual", "startDate": "2026-02-12"}	2	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10078	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-14", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-12", "destination": "Chi nhánh Tỉnh"}	2	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10080	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-15", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-13", "destination": "Chi nhánh Tỉnh"}	3	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10081	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-14", "leaveType": "annual", "startDate": "2026-02-14"}	4	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10083	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-15", "leaveType": "annual", "startDate": "2026-02-15"}	5	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10084	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-17", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-15", "destination": "Chi nhánh Tỉnh"}	5	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10085	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-16", "leaveType": "annual", "startDate": "2026-02-16"}	6	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10086	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-18", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-16", "destination": "Chi nhánh Tỉnh"}	6	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10087	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-17", "leaveType": "annual", "startDate": "2026-02-17"}	7	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10088	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-19", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-17", "destination": "Chi nhánh Tỉnh"}	7	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10089	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-18", "leaveType": "annual", "startDate": "2026-02-18"}	8	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10090	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-20", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-18", "destination": "Chi nhánh Tỉnh"}	8	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10091	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-19", "leaveType": "annual", "startDate": "2026-02-19"}	9	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10092	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-21", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-19", "destination": "Chi nhánh Tỉnh"}	9	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10093	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-10", "leaveType": "annual", "startDate": "2026-02-10"}	10	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10094	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-12", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-10", "destination": "Chi nhánh Tỉnh"}	10	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10095	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-11", "leaveType": "annual", "startDate": "2026-02-11"}	11	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10096	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-13", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-11", "destination": "Chi nhánh Tỉnh"}	11	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10097	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-12", "leaveType": "annual", "startDate": "2026-02-12"}	12	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10098	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-14", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-12", "destination": "Chi nhánh Tỉnh"}	12	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10099	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-13", "leaveType": "annual", "startDate": "2026-02-13"}	13	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10100	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-15", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-13", "destination": "Chi nhánh Tỉnh"}	13	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10101	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-14", "leaveType": "annual", "startDate": "2026-02-14"}	14	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10103	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-15", "leaveType": "annual", "startDate": "2026-02-15"}	15	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10104	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-17", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-15", "destination": "Chi nhánh Tỉnh"}	15	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10105	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-16", "leaveType": "annual", "startDate": "2026-02-16"}	16	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10106	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-18", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-16", "destination": "Chi nhánh Tỉnh"}	16	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10107	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-17", "leaveType": "annual", "startDate": "2026-02-17"}	17	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10108	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-19", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-17", "destination": "Chi nhánh Tỉnh"}	17	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10079	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-11", "leaveType": "annual", "startDate": "2026-02-11"}	3	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10109	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-18", "leaveType": "annual", "startDate": "2026-02-18"}	18	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10110	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-20", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-18", "destination": "Chi nhánh Tỉnh"}	18	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10111	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-19", "leaveType": "annual", "startDate": "2026-02-19"}	19	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10112	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-21", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-19", "destination": "Chi nhánh Tỉnh"}	19	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10113	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-10", "leaveType": "annual", "startDate": "2026-02-10"}	20	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10114	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-12", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-10", "destination": "Chi nhánh Tỉnh"}	20	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10115	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-11", "leaveType": "annual", "startDate": "2026-02-11"}	21	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10116	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-13", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-11", "destination": "Chi nhánh Tỉnh"}	21	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10117	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-12", "leaveType": "annual", "startDate": "2026-02-12"}	22	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10118	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-14", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-12", "destination": "Chi nhánh Tỉnh"}	22	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10119	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-13", "leaveType": "annual", "startDate": "2026-02-13"}	23	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10120	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-15", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-13", "destination": "Chi nhánh Tỉnh"}	23	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10121	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-14", "leaveType": "annual", "startDate": "2026-02-14"}	24	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10123	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-15", "leaveType": "annual", "startDate": "2026-02-15"}	25	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10124	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-17", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-15", "destination": "Chi nhánh Tỉnh"}	25	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10125	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-16", "leaveType": "annual", "startDate": "2026-02-16"}	26	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10126	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-18", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-16", "destination": "Chi nhánh Tỉnh"}	26	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10127	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-17", "leaveType": "annual", "startDate": "2026-02-17"}	27	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10128	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-19", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-17", "destination": "Chi nhánh Tỉnh"}	27	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10129	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-18", "leaveType": "annual", "startDate": "2026-02-18"}	28	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10130	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-20", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-18", "destination": "Chi nhánh Tỉnh"}	28	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10131	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-19", "leaveType": "annual", "startDate": "2026-02-19"}	29	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10132	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-21", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-19", "destination": "Chi nhánh Tỉnh"}	29	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10133	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-10", "leaveType": "annual", "startDate": "2026-02-10"}	30	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10134	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-12", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-10", "destination": "Chi nhánh Tỉnh"}	30	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10135	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-11", "leaveType": "annual", "startDate": "2026-02-11"}	31	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10136	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-13", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-11", "destination": "Chi nhánh Tỉnh"}	31	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10137	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-12", "leaveType": "annual", "startDate": "2026-02-12"}	32	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10138	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-14", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-12", "destination": "Chi nhánh Tỉnh"}	32	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10139	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-13", "leaveType": "annual", "startDate": "2026-02-13"}	33	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10140	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-15", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-13", "destination": "Chi nhánh Tỉnh"}	33	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10141	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-14", "leaveType": "annual", "startDate": "2026-02-14"}	34	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10143	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-15", "leaveType": "annual", "startDate": "2026-02-15"}	35	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10144	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-17", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-15", "destination": "Chi nhánh Tỉnh"}	35	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10145	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-16", "leaveType": "annual", "startDate": "2026-02-16"}	36	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10146	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-18", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-16", "destination": "Chi nhánh Tỉnh"}	36	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10147	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-17", "leaveType": "annual", "startDate": "2026-02-17"}	37	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10148	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-19", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-17", "destination": "Chi nhánh Tỉnh"}	37	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10149	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-18", "leaveType": "annual", "startDate": "2026-02-18"}	38	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10150	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-20", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-18", "destination": "Chi nhánh Tỉnh"}	38	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10151	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-19", "leaveType": "annual", "startDate": "2026-02-19"}	39	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10152	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-21", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-19", "destination": "Chi nhánh Tỉnh"}	39	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10153	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-10", "leaveType": "annual", "startDate": "2026-02-10"}	40	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10154	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-12", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-10", "destination": "Chi nhánh Tỉnh"}	40	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10155	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-11", "leaveType": "annual", "startDate": "2026-02-11"}	41	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10156	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-13", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-11", "destination": "Chi nhánh Tỉnh"}	41	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10157	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-12", "leaveType": "annual", "startDate": "2026-02-12"}	42	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10158	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-14", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-12", "destination": "Chi nhánh Tỉnh"}	42	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10159	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-13", "leaveType": "annual", "startDate": "2026-02-13"}	43	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10160	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-15", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-13", "destination": "Chi nhánh Tỉnh"}	43	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10161	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-14", "leaveType": "annual", "startDate": "2026-02-14"}	44	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10163	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-15", "leaveType": "annual", "startDate": "2026-02-15"}	45	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10164	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-17", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-15", "destination": "Chi nhánh Tỉnh"}	45	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10165	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-16", "leaveType": "annual", "startDate": "2026-02-16"}	46	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10166	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-18", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-16", "destination": "Chi nhánh Tỉnh"}	46	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10167	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-17", "leaveType": "annual", "startDate": "2026-02-17"}	47	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10168	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-19", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-17", "destination": "Chi nhánh Tỉnh"}	47	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10169	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-18", "leaveType": "annual", "startDate": "2026-02-18"}	48	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10170	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-20", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-18", "destination": "Chi nhánh Tỉnh"}	48	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10171	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-19", "leaveType": "annual", "startDate": "2026-02-19"}	49	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10172	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-21", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-19", "destination": "Chi nhánh Tỉnh"}	49	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10173	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Auto)", "endDate": "2026-02-10", "leaveType": "annual", "startDate": "2026-02-10"}	50	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10174	business-trip	1	{"reason": "Công tác định kỳ (Auto)", "endDate": "2026-01-12", "location": "Chi nhánh Tỉnh", "startDate": "2026-01-10", "destination": "Chi nhánh Tỉnh"}	50	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10740	overtime	1	{"reason": "không ", "startTime": "2026-02-12T17:01:00.000Z", "overtimeDate": "2026-02-12T17:00:00.000Z", "overtimeHours": 2}	3	2	2026-02-12 18:46:32.129+07	2026-02-12 15:07:43.306263+07	2026-02-12 15:07:43.306263+07	\N	\N	\N	\N
10175	leave	1	{"isPaid": true, "reason": "Nghỉ phép thêm", "endDate": "2026-02-05", "leaveType": "annual", "startDate": "2026-02-05"}	1	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10177	leave	1	{"isPaid": true, "reason": "Nghỉ phép thêm", "endDate": "2026-02-05", "leaveType": "annual", "startDate": "2026-02-05"}	2	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10179	leave	1	{"isPaid": true, "reason": "Nghỉ phép thêm", "endDate": "2026-02-05", "leaveType": "annual", "startDate": "2026-02-05"}	3	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10181	leave	1	{"isPaid": true, "reason": "Nghỉ phép thêm", "endDate": "2026-02-05", "leaveType": "annual", "startDate": "2026-02-05"}	4	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10182	leave	1	{"isPaid": true, "reason": "Nghỉ phép thêm", "endDate": "2026-02-05", "leaveType": "annual", "startDate": "2026-02-05"}	5	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10180	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-24", "leaveType": "unpaid", "startDate": "2026-02-23"}	4	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10184	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-23", "leaveType": "unpaid", "startDate": "2026-02-23"}	8	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10186	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-27"}	9	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10187	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-27"}	10	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10188	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-23", "leaveType": "unpaid", "startDate": "2026-02-22"}	11	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10190	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-27"}	12	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10191	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-22", "leaveType": "unpaid", "startDate": "2026-02-21"}	13	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10193	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-20", "leaveType": "unpaid", "startDate": "2026-02-20"}	14	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10194	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-23", "leaveType": "unpaid", "startDate": "2026-02-22"}	18	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10195	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-22", "leaveType": "unpaid", "startDate": "2026-02-21"}	19	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10196	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-27"}	20	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10197	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-24", "leaveType": "unpaid", "startDate": "2026-02-23"}	21	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10198	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-27"}	22	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10200	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-21", "leaveType": "unpaid", "startDate": "2026-02-20"}	23	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10202	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-25", "leaveType": "unpaid", "startDate": "2026-02-25"}	25	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10204	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-26"}	26	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10205	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-24", "leaveType": "unpaid", "startDate": "2026-02-23"}	27	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10206	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-22", "leaveType": "unpaid", "startDate": "2026-02-21"}	28	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10210	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-23", "leaveType": "unpaid", "startDate": "2026-02-23"}	36	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10212	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-25", "leaveType": "unpaid", "startDate": "2026-02-25"}	37	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10178	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-28", "leaveType": "sick", "startDate": "2026-01-28"}	3	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10183	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-20", "leaveType": "sick", "startDate": "2026-01-20"}	7	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10185	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-25", "leaveType": "sick", "startDate": "2026-01-25"}	8	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10189	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-24", "leaveType": "sick", "startDate": "2026-01-24"}	11	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10192	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-22", "leaveType": "sick", "startDate": "2026-01-22"}	13	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10199	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-20", "leaveType": "sick", "startDate": "2026-01-20"}	22	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10201	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-20", "leaveType": "sick", "startDate": "2026-01-20"}	23	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10203	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-24", "leaveType": "sick", "startDate": "2026-01-24"}	25	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10207	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-21", "leaveType": "sick", "startDate": "2026-01-21"}	32	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10208	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-23", "leaveType": "sick", "startDate": "2026-01-23"}	33	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10209	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-23", "leaveType": "sick", "startDate": "2026-01-23"}	34	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10211	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-22", "leaveType": "sick", "startDate": "2026-01-22"}	36	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10214	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-24", "leaveType": "unpaid", "startDate": "2026-02-24"}	38	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10215	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-24", "leaveType": "unpaid", "startDate": "2026-02-23"}	39	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10216	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-21", "leaveType": "unpaid", "startDate": "2026-02-21"}	40	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10217	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-25", "leaveType": "unpaid", "startDate": "2026-02-24"}	41	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10218	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-23", "leaveType": "unpaid", "startDate": "2026-02-23"}	42	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10220	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-26"}	44	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10222	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-20", "leaveType": "unpaid", "startDate": "2026-02-20"}	45	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10225	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-27"}	48	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10226	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-20", "leaveType": "unpaid", "startDate": "2026-02-20"}	49	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10227	leave	1	{"isPaid": false, "reason": "Nghỉ việc riêng (Không lương)", "endDate": "2026-02-26", "leaveType": "unpaid", "startDate": "2026-02-25"}	50	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10213	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-27", "leaveType": "sick", "startDate": "2026-01-27"}	37	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10219	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-20", "leaveType": "sick", "startDate": "2026-01-20"}	43	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10221	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-26", "leaveType": "sick", "startDate": "2026-01-26"}	44	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10223	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-24", "leaveType": "sick", "startDate": "2026-01-24"}	45	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10224	leave	1	{"isPaid": true, "reason": "Nghỉ ốm", "endDate": "2026-01-20", "leaveType": "sick", "startDate": "2026-01-20"}	47	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10234	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-08", "leaveType": "annual", "startDate": "2025-11-08"}	1	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
10242	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-27", "leaveType": "annual", "startDate": "2025-11-27"}	2	\N	\N	2025-11-27 07:00:00+07	2025-11-27 07:00:00+07	\N	\N	\N	\N
10229	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-22", "leaveType": "unpaid", "startDate": "2026-01-22"}	1	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
10230	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-02", "leaveType": "unpaid", "startDate": "2026-01-02"}	1	\N	\N	2026-01-02 07:00:00+07	2026-01-02 07:00:00+07	\N	\N	\N	\N
10231	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-28"}	1	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
10232	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-22", "leaveType": "unpaid", "startDate": "2025-10-22"}	1	\N	\N	2025-10-22 07:00:00+07	2025-10-22 07:00:00+07	\N	\N	\N	\N
10233	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-24", "leaveType": "unpaid", "startDate": "2026-02-24"}	1	\N	\N	2026-02-24 07:00:00+07	2026-02-24 07:00:00+07	\N	\N	\N	\N
10235	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-06", "leaveType": "unpaid", "startDate": "2026-01-06"}	1	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
10236	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-24", "leaveType": "unpaid", "startDate": "2026-01-24"}	1	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
10237	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-09", "leaveType": "unpaid", "startDate": "2025-12-09"}	1	\N	\N	2025-12-09 07:00:00+07	2025-12-09 07:00:00+07	\N	\N	\N	\N
10238	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-11", "leaveType": "unpaid", "startDate": "2025-10-11"}	1	\N	\N	2025-10-11 07:00:00+07	2025-10-11 07:00:00+07	\N	\N	\N	\N
10239	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-14", "leaveType": "unpaid", "startDate": "2025-12-14"}	1	\N	\N	2025-12-14 07:00:00+07	2025-12-14 07:00:00+07	\N	\N	\N	\N
10240	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-28", "leaveType": "unpaid", "startDate": "2025-11-28"}	2	\N	\N	2025-11-28 07:00:00+07	2025-11-28 07:00:00+07	\N	\N	\N	\N
10241	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-02", "leaveType": "unpaid", "startDate": "2025-12-02"}	2	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
10243	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-25", "leaveType": "unpaid", "startDate": "2025-12-25"}	2	\N	\N	2025-12-25 07:00:00+07	2025-12-25 07:00:00+07	\N	\N	\N	\N
10244	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-06", "leaveType": "unpaid", "startDate": "2025-10-06"}	2	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
10245	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-31", "leaveType": "unpaid", "startDate": "2025-10-31"}	2	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
10246	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-20", "leaveType": "unpaid", "startDate": "2025-10-20"}	2	\N	\N	2025-10-20 07:00:00+07	2025-10-20 07:00:00+07	\N	\N	\N	\N
10247	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-02", "leaveType": "unpaid", "startDate": "2026-01-02"}	2	\N	\N	2026-01-02 07:00:00+07	2026-01-02 07:00:00+07	\N	\N	\N	\N
10248	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-15", "leaveType": "unpaid", "startDate": "2025-12-15"}	2	\N	\N	2025-12-15 07:00:00+07	2025-12-15 07:00:00+07	\N	\N	\N	\N
10249	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-22", "leaveType": "unpaid", "startDate": "2026-02-22"}	3	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10251	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-22", "leaveType": "unpaid", "startDate": "2025-10-22"}	3	\N	\N	2025-10-22 07:00:00+07	2025-10-22 07:00:00+07	\N	\N	\N	\N
10253	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-10", "leaveType": "unpaid", "startDate": "2025-10-10"}	3	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
10254	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-15", "leaveType": "unpaid", "startDate": "2025-12-15"}	3	\N	\N	2025-12-15 07:00:00+07	2025-12-15 07:00:00+07	\N	\N	\N	\N
10256	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-01", "leaveType": "unpaid", "startDate": "2025-11-01"}	3	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
10257	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-06", "leaveType": "unpaid", "startDate": "2026-01-06"}	3	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
10259	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-08", "leaveType": "unpaid", "startDate": "2025-12-08"}	3	\N	\N	2025-12-08 07:00:00+07	2025-12-08 07:00:00+07	\N	\N	\N	\N
10260	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-25", "leaveType": "unpaid", "startDate": "2025-11-25"}	4	\N	\N	2025-11-25 07:00:00+07	2025-11-25 07:00:00+07	\N	\N	\N	\N
10261	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-05", "leaveType": "unpaid", "startDate": "2026-02-05"}	4	\N	\N	2026-02-05 07:00:00+07	2026-02-05 07:00:00+07	\N	\N	\N	\N
10262	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-27"}	4	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10255	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-25", "leaveType": "sick", "startDate": "2025-11-25"}	3	\N	\N	2025-11-25 07:00:00+07	2025-11-25 07:00:00+07	\N	\N	\N	\N
10296	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-04", "leaveType": "annual", "startDate": "2025-11-04"}	7	\N	\N	2025-11-04 07:00:00+07	2025-11-04 07:00:00+07	\N	\N	\N	\N
10264	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-04", "leaveType": "unpaid", "startDate": "2026-01-04"}	4	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
10265	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-20", "leaveType": "unpaid", "startDate": "2026-02-20"}	4	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10266	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-23", "leaveType": "unpaid", "startDate": "2026-01-23"}	4	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
10267	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-29", "leaveType": "unpaid", "startDate": "2025-12-29"}	4	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
10268	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-10", "leaveType": "unpaid", "startDate": "2025-12-10"}	4	\N	\N	2025-12-10 07:00:00+07	2025-12-10 07:00:00+07	\N	\N	\N	\N
10269	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-25", "leaveType": "unpaid", "startDate": "2025-11-25"}	5	\N	\N	2025-11-25 07:00:00+07	2025-11-25 07:00:00+07	\N	\N	\N	\N
10270	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-26", "leaveType": "unpaid", "startDate": "2025-12-26"}	5	\N	\N	2025-12-26 07:00:00+07	2025-12-26 07:00:00+07	\N	\N	\N	\N
10272	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-15", "leaveType": "unpaid", "startDate": "2026-02-15"}	5	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10273	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-07", "leaveType": "unpaid", "startDate": "2025-11-07"}	5	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
10275	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-10", "leaveType": "unpaid", "startDate": "2026-01-10"}	5	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
10276	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-09", "leaveType": "unpaid", "startDate": "2025-10-09"}	5	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
10277	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-05", "leaveType": "unpaid", "startDate": "2025-12-05"}	5	\N	\N	2025-12-05 07:00:00+07	2025-12-05 07:00:00+07	\N	\N	\N	\N
10278	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-01", "leaveType": "unpaid", "startDate": "2025-11-01"}	5	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
10279	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-21", "leaveType": "unpaid", "startDate": "2026-02-21"}	6	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10281	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-20", "leaveType": "unpaid", "startDate": "2026-02-20"}	6	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10282	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-27"}	6	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10283	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-16", "leaveType": "unpaid", "startDate": "2025-11-16"}	6	\N	\N	2025-11-16 07:00:00+07	2025-11-16 07:00:00+07	\N	\N	\N	\N
10284	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-27"}	6	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10285	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-01", "leaveType": "unpaid", "startDate": "2025-11-01"}	6	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
10286	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-07", "leaveType": "unpaid", "startDate": "2025-11-07"}	6	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
10288	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-07", "leaveType": "unpaid", "startDate": "2025-11-07"}	6	\N	\N	2025-11-07 07:00:00+07	2025-11-07 07:00:00+07	\N	\N	\N	\N
10290	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-23", "leaveType": "unpaid", "startDate": "2025-10-23"}	7	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
10291	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-28", "leaveType": "unpaid", "startDate": "2025-12-28"}	7	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
10292	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-05", "leaveType": "unpaid", "startDate": "2026-01-05"}	7	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10293	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-22", "leaveType": "unpaid", "startDate": "2026-02-22"}	7	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10294	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-03", "leaveType": "unpaid", "startDate": "2026-01-03"}	7	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
10295	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-02", "leaveType": "unpaid", "startDate": "2025-11-02"}	7	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
10297	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-04", "leaveType": "unpaid", "startDate": "2025-10-04"}	7	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
10271	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-04", "leaveType": "sick", "startDate": "2025-10-04"}	5	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
10274	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-02", "leaveType": "sick", "startDate": "2025-10-02"}	5	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
10280	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-22", "leaveType": "sick", "startDate": "2025-12-22"}	6	\N	\N	2025-12-22 07:00:00+07	2025-12-22 07:00:00+07	\N	\N	\N	\N
10287	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-16", "leaveType": "sick", "startDate": "2026-02-16"}	6	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10309	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-30", "leaveType": "annual", "startDate": "2025-12-30"}	9	\N	\N	2025-12-30 07:00:00+07	2025-12-30 07:00:00+07	\N	\N	\N	\N
10316	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-11", "leaveType": "annual", "startDate": "2025-11-11"}	10	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
10317	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-19", "leaveType": "annual", "startDate": "2025-10-19"}	10	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10299	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-11", "leaveType": "unpaid", "startDate": "2025-12-11"}	7	\N	\N	2025-12-11 07:00:00+07	2025-12-11 07:00:00+07	\N	\N	\N	\N
10300	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-14", "leaveType": "unpaid", "startDate": "2026-02-14"}	8	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
10301	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-22", "leaveType": "unpaid", "startDate": "2026-02-22"}	8	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10302	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-20", "leaveType": "unpaid", "startDate": "2025-10-20"}	8	\N	\N	2025-10-20 07:00:00+07	2025-10-20 07:00:00+07	\N	\N	\N	\N
10303	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-14", "leaveType": "unpaid", "startDate": "2025-10-14"}	8	\N	\N	2025-10-14 07:00:00+07	2025-10-14 07:00:00+07	\N	\N	\N	\N
10304	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-09", "leaveType": "unpaid", "startDate": "2025-11-09"}	8	\N	\N	2025-11-09 07:00:00+07	2025-11-09 07:00:00+07	\N	\N	\N	\N
10305	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-09", "leaveType": "unpaid", "startDate": "2026-02-09"}	8	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10306	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-08", "leaveType": "unpaid", "startDate": "2026-02-08"}	8	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
10308	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-15", "leaveType": "unpaid", "startDate": "2025-11-15"}	9	\N	\N	2025-11-15 07:00:00+07	2025-11-15 07:00:00+07	\N	\N	\N	\N
10310	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-20", "leaveType": "unpaid", "startDate": "2025-10-20"}	9	\N	\N	2025-10-20 07:00:00+07	2025-10-20 07:00:00+07	\N	\N	\N	\N
10311	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-25", "leaveType": "unpaid", "startDate": "2026-01-25"}	9	\N	\N	2026-01-25 07:00:00+07	2026-01-25 07:00:00+07	\N	\N	\N	\N
10313	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-20", "leaveType": "unpaid", "startDate": "2025-10-20"}	9	\N	\N	2025-10-20 07:00:00+07	2025-10-20 07:00:00+07	\N	\N	\N	\N
10314	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-17", "leaveType": "unpaid", "startDate": "2025-12-17"}	9	\N	\N	2025-12-17 07:00:00+07	2025-12-17 07:00:00+07	\N	\N	\N	\N
10315	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-11", "leaveType": "unpaid", "startDate": "2026-02-11"}	9	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
10318	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-21", "leaveType": "unpaid", "startDate": "2026-01-21"}	10	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
10319	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-07", "leaveType": "unpaid", "startDate": "2026-02-07"}	10	\N	\N	2026-02-07 07:00:00+07	2026-02-07 07:00:00+07	\N	\N	\N	\N
10320	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-13", "leaveType": "unpaid", "startDate": "2026-02-13"}	10	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10321	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-31", "leaveType": "unpaid", "startDate": "2025-10-31"}	10	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
10322	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-02", "leaveType": "unpaid", "startDate": "2025-10-02"}	10	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
10323	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-19", "leaveType": "unpaid", "startDate": "2025-10-19"}	10	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10324	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-11", "leaveType": "unpaid", "startDate": "2025-11-11"}	10	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
10325	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-19", "leaveType": "unpaid", "startDate": "2025-10-19"}	11	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10326	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-22", "leaveType": "unpaid", "startDate": "2025-12-22"}	11	\N	\N	2025-12-22 07:00:00+07	2025-12-22 07:00:00+07	\N	\N	\N	\N
10327	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-12", "leaveType": "unpaid", "startDate": "2025-12-12"}	11	\N	\N	2025-12-12 07:00:00+07	2025-12-12 07:00:00+07	\N	\N	\N	\N
10328	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-06", "leaveType": "unpaid", "startDate": "2026-01-06"}	11	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
10329	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-11", "leaveType": "unpaid", "startDate": "2026-01-11"}	11	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
10330	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-26", "leaveType": "unpaid", "startDate": "2025-10-26"}	11	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
10331	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-13", "leaveType": "unpaid", "startDate": "2025-12-13"}	11	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
10332	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-25", "leaveType": "unpaid", "startDate": "2026-02-25"}	11	\N	\N	2026-02-25 07:00:00+07	2026-02-25 07:00:00+07	\N	\N	\N	\N
10307	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-22", "leaveType": "sick", "startDate": "2025-11-22"}	8	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
10312	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-19", "leaveType": "sick", "startDate": "2025-10-19"}	9	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10342	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-12", "leaveType": "annual", "startDate": "2025-10-12"}	12	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
10344	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-20", "leaveType": "annual", "startDate": "2025-12-20"}	12	\N	\N	2025-12-20 07:00:00+07	2025-12-20 07:00:00+07	\N	\N	\N	\N
10345	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-03", "leaveType": "annual", "startDate": "2025-10-03"}	12	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
10355	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-07", "leaveType": "annual", "startDate": "2025-10-07"}	13	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
10357	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-04", "leaveType": "annual", "startDate": "2025-11-04"}	13	\N	\N	2025-11-04 07:00:00+07	2025-11-04 07:00:00+07	\N	\N	\N	\N
10360	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-25", "leaveType": "annual", "startDate": "2025-10-25"}	14	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
10368	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-07", "leaveType": "annual", "startDate": "2025-10-07"}	15	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
10334	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-24", "leaveType": "unpaid", "startDate": "2025-12-24"}	11	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
10335	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-04", "leaveType": "unpaid", "startDate": "2025-10-04"}	11	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
10337	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-02", "leaveType": "unpaid", "startDate": "2026-02-02"}	12	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
10338	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-17", "leaveType": "unpaid", "startDate": "2026-02-17"}	12	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10340	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-03", "leaveType": "unpaid", "startDate": "2025-10-03"}	12	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
10346	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-16", "leaveType": "unpaid", "startDate": "2025-12-16"}	12	\N	\N	2025-12-16 07:00:00+07	2025-12-16 07:00:00+07	\N	\N	\N	\N
10347	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-03", "leaveType": "unpaid", "startDate": "2025-11-03"}	12	\N	\N	2025-11-03 07:00:00+07	2025-11-03 07:00:00+07	\N	\N	\N	\N
10348	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-07", "leaveType": "unpaid", "startDate": "2025-10-07"}	12	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
10349	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-11", "leaveType": "unpaid", "startDate": "2025-11-11"}	13	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
10351	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-18", "leaveType": "unpaid", "startDate": "2026-01-18"}	13	\N	\N	2026-01-18 07:00:00+07	2026-01-18 07:00:00+07	\N	\N	\N	\N
10352	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-16", "leaveType": "unpaid", "startDate": "2025-11-16"}	13	\N	\N	2025-11-16 07:00:00+07	2025-11-16 07:00:00+07	\N	\N	\N	\N
10353	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-11", "leaveType": "unpaid", "startDate": "2026-01-11"}	13	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
10354	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-12", "leaveType": "unpaid", "startDate": "2025-11-12"}	13	\N	\N	2025-11-12 07:00:00+07	2025-11-12 07:00:00+07	\N	\N	\N	\N
10356	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-27"}	13	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10358	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-02", "leaveType": "unpaid", "startDate": "2026-02-02"}	14	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
10359	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-11", "leaveType": "unpaid", "startDate": "2026-01-11"}	14	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
10361	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-08", "leaveType": "unpaid", "startDate": "2025-10-08"}	14	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
10362	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-01", "leaveType": "unpaid", "startDate": "2025-10-01"}	14	\N	\N	2025-10-01 07:00:00+07	2025-10-01 07:00:00+07	\N	\N	\N	\N
10365	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-24", "leaveType": "unpaid", "startDate": "2025-10-24"}	14	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
10366	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-13", "leaveType": "unpaid", "startDate": "2025-11-13"}	15	\N	\N	2025-11-13 07:00:00+07	2025-11-13 07:00:00+07	\N	\N	\N	\N
10367	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-10", "leaveType": "unpaid", "startDate": "2026-01-10"}	15	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
10336	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-30", "leaveType": "sick", "startDate": "2025-12-30"}	11	\N	\N	2025-12-30 07:00:00+07	2025-12-30 07:00:00+07	\N	\N	\N	\N
10339	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-24", "leaveType": "sick", "startDate": "2026-02-24"}	12	\N	\N	2026-02-24 07:00:00+07	2026-02-24 07:00:00+07	\N	\N	\N	\N
10341	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-12", "leaveType": "sick", "startDate": "2025-11-12"}	12	\N	\N	2025-11-12 07:00:00+07	2025-11-12 07:00:00+07	\N	\N	\N	\N
10343	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-21", "leaveType": "sick", "startDate": "2025-11-21"}	12	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
10350	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-08", "leaveType": "sick", "startDate": "2026-02-08"}	13	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
10363	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-25", "leaveType": "sick", "startDate": "2025-10-25"}	14	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
10382	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-08", "leaveType": "annual", "startDate": "2025-10-08"}	16	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
10390	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-16", "leaveType": "annual", "startDate": "2025-12-16"}	17	\N	\N	2025-12-16 07:00:00+07	2025-12-16 07:00:00+07	\N	\N	\N	\N
10392	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-26", "leaveType": "annual", "startDate": "2026-01-26"}	17	\N	\N	2026-01-26 07:00:00+07	2026-01-26 07:00:00+07	\N	\N	\N	\N
10399	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-17", "leaveType": "annual", "startDate": "2026-02-17"}	18	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10400	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-09", "leaveType": "annual", "startDate": "2026-02-09"}	18	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10403	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-12", "leaveType": "annual", "startDate": "2025-11-12"}	18	\N	\N	2025-11-12 07:00:00+07	2025-11-12 07:00:00+07	\N	\N	\N	\N
10370	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-06", "leaveType": "unpaid", "startDate": "2025-12-06"}	15	\N	\N	2025-12-06 07:00:00+07	2025-12-06 07:00:00+07	\N	\N	\N	\N
10371	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-15", "leaveType": "unpaid", "startDate": "2026-01-15"}	15	\N	\N	2026-01-15 07:00:00+07	2026-01-15 07:00:00+07	\N	\N	\N	\N
10372	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-02", "leaveType": "unpaid", "startDate": "2025-12-02"}	15	\N	\N	2025-12-02 07:00:00+07	2025-12-02 07:00:00+07	\N	\N	\N	\N
10373	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-15", "leaveType": "unpaid", "startDate": "2025-10-15"}	15	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
10374	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-19", "leaveType": "unpaid", "startDate": "2025-10-19"}	16	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10375	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-25", "leaveType": "unpaid", "startDate": "2025-11-25"}	16	\N	\N	2025-11-25 07:00:00+07	2025-11-25 07:00:00+07	\N	\N	\N	\N
10376	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-02", "leaveType": "unpaid", "startDate": "2025-10-02"}	16	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
10377	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-06", "leaveType": "unpaid", "startDate": "2025-10-06"}	16	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
10378	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-23", "leaveType": "unpaid", "startDate": "2025-10-23"}	16	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
10379	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-09", "leaveType": "unpaid", "startDate": "2025-12-09"}	16	\N	\N	2025-12-09 07:00:00+07	2025-12-09 07:00:00+07	\N	\N	\N	\N
10381	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-22", "leaveType": "unpaid", "startDate": "2025-11-22"}	16	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
10383	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-20", "leaveType": "unpaid", "startDate": "2026-01-20"}	16	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10384	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-13", "leaveType": "unpaid", "startDate": "2025-12-13"}	16	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
10385	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-23", "leaveType": "unpaid", "startDate": "2025-11-23"}	16	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
10386	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-27", "leaveType": "unpaid", "startDate": "2025-12-27"}	17	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
10387	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-08", "leaveType": "unpaid", "startDate": "2025-11-08"}	17	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
10388	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-22", "leaveType": "unpaid", "startDate": "2025-10-22"}	17	\N	\N	2025-10-22 07:00:00+07	2025-10-22 07:00:00+07	\N	\N	\N	\N
10393	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-02", "leaveType": "unpaid", "startDate": "2025-10-02"}	17	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
10394	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-16", "leaveType": "unpaid", "startDate": "2025-12-16"}	17	\N	\N	2025-12-16 07:00:00+07	2025-12-16 07:00:00+07	\N	\N	\N	\N
10395	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-04", "leaveType": "unpaid", "startDate": "2025-12-04"}	17	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
10396	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-25", "leaveType": "unpaid", "startDate": "2026-02-25"}	17	\N	\N	2026-02-25 07:00:00+07	2026-02-25 07:00:00+07	\N	\N	\N	\N
10397	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-15", "leaveType": "unpaid", "startDate": "2025-10-15"}	17	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
10398	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-11", "leaveType": "unpaid", "startDate": "2026-01-11"}	18	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
10401	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-25", "leaveType": "unpaid", "startDate": "2025-11-25"}	18	\N	\N	2025-11-25 07:00:00+07	2025-11-25 07:00:00+07	\N	\N	\N	\N
10402	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-25", "leaveType": "unpaid", "startDate": "2025-11-25"}	18	\N	\N	2025-11-25 07:00:00+07	2025-11-25 07:00:00+07	\N	\N	\N	\N
10389	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-29", "leaveType": "sick", "startDate": "2025-12-29"}	17	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
10391	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-24", "leaveType": "sick", "startDate": "2025-12-24"}	17	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
10407	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-28", "leaveType": "annual", "startDate": "2026-02-28"}	18	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
10413	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-15", "leaveType": "annual", "startDate": "2025-11-15"}	19	\N	\N	2025-11-15 07:00:00+07	2025-11-15 07:00:00+07	\N	\N	\N	\N
10415	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-12", "leaveType": "annual", "startDate": "2025-11-12"}	19	\N	\N	2025-11-12 07:00:00+07	2025-11-12 07:00:00+07	\N	\N	\N	\N
10422	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-08", "leaveType": "annual", "startDate": "2025-11-08"}	20	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
10430	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-14", "leaveType": "annual", "startDate": "2025-10-14"}	21	\N	\N	2025-10-14 07:00:00+07	2025-10-14 07:00:00+07	\N	\N	\N	\N
10406	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-16", "leaveType": "unpaid", "startDate": "2026-01-16"}	18	\N	\N	2026-01-16 07:00:00+07	2026-01-16 07:00:00+07	\N	\N	\N	\N
10409	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-20", "leaveType": "unpaid", "startDate": "2026-02-20"}	18	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10410	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-23", "leaveType": "unpaid", "startDate": "2025-12-23"}	19	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
10411	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-18", "leaveType": "unpaid", "startDate": "2026-02-18"}	19	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
10414	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-03", "leaveType": "unpaid", "startDate": "2026-01-03"}	19	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
10416	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-27", "leaveType": "unpaid", "startDate": "2025-12-27"}	19	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
10417	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-20", "leaveType": "unpaid", "startDate": "2025-11-20"}	19	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
10418	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-12", "leaveType": "unpaid", "startDate": "2026-02-12"}	19	\N	\N	2026-02-12 07:00:00+07	2026-02-12 07:00:00+07	\N	\N	\N	\N
10419	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-27", "leaveType": "unpaid", "startDate": "2025-10-27"}	20	\N	\N	2025-10-27 07:00:00+07	2025-10-27 07:00:00+07	\N	\N	\N	\N
10420	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-17", "leaveType": "unpaid", "startDate": "2026-01-17"}	20	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
10421	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-02", "leaveType": "unpaid", "startDate": "2026-01-02"}	20	\N	\N	2026-01-02 07:00:00+07	2026-01-02 07:00:00+07	\N	\N	\N	\N
10423	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-05", "leaveType": "unpaid", "startDate": "2025-12-05"}	20	\N	\N	2025-12-05 07:00:00+07	2025-12-05 07:00:00+07	\N	\N	\N	\N
10424	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-28"}	20	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
10425	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-21", "leaveType": "unpaid", "startDate": "2025-11-21"}	20	\N	\N	2025-11-21 07:00:00+07	2025-11-21 07:00:00+07	\N	\N	\N	\N
10426	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-16", "leaveType": "unpaid", "startDate": "2025-10-16"}	20	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
10427	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-01", "leaveType": "unpaid", "startDate": "2025-11-01"}	20	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
10428	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-03", "leaveType": "unpaid", "startDate": "2025-12-03"}	21	\N	\N	2025-12-03 07:00:00+07	2025-12-03 07:00:00+07	\N	\N	\N	\N
10429	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-21", "leaveType": "unpaid", "startDate": "2026-01-21"}	21	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
10431	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-09", "leaveType": "unpaid", "startDate": "2025-10-09"}	21	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
10433	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-27", "leaveType": "unpaid", "startDate": "2026-02-27"}	21	\N	\N	2026-02-27 07:00:00+07	2026-02-27 07:00:00+07	\N	\N	\N	\N
10434	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-08", "leaveType": "unpaid", "startDate": "2025-10-08"}	21	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
10435	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-24", "leaveType": "unpaid", "startDate": "2025-11-24"}	21	\N	\N	2025-11-24 07:00:00+07	2025-11-24 07:00:00+07	\N	\N	\N	\N
10436	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-02", "leaveType": "unpaid", "startDate": "2025-10-02"}	21	\N	\N	2025-10-02 07:00:00+07	2025-10-02 07:00:00+07	\N	\N	\N	\N
10437	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-26", "leaveType": "unpaid", "startDate": "2025-11-26"}	21	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
10438	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-24", "leaveType": "unpaid", "startDate": "2025-10-24"}	21	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
10404	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-15", "leaveType": "sick", "startDate": "2025-10-15"}	18	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
10408	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-01", "leaveType": "sick", "startDate": "2025-11-01"}	18	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
10432	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-12", "leaveType": "sick", "startDate": "2026-02-12"}	21	\N	\N	2026-02-12 07:00:00+07	2026-02-12 07:00:00+07	\N	\N	\N	\N
10440	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-14", "leaveType": "annual", "startDate": "2025-11-14"}	22	\N	\N	2025-11-14 07:00:00+07	2025-11-14 07:00:00+07	\N	\N	\N	\N
10449	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-26", "leaveType": "annual", "startDate": "2025-11-26"}	23	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
10450	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-10", "leaveType": "annual", "startDate": "2026-02-10"}	23	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10454	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-18", "leaveType": "annual", "startDate": "2026-02-18"}	23	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
10468	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-12", "leaveType": "annual", "startDate": "2025-10-12"}	24	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
10469	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-20", "leaveType": "annual", "startDate": "2026-02-20"}	24	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10441	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-13", "leaveType": "unpaid", "startDate": "2026-01-13"}	22	\N	\N	2026-01-13 07:00:00+07	2026-01-13 07:00:00+07	\N	\N	\N	\N
10442	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-06", "leaveType": "unpaid", "startDate": "2025-10-06"}	22	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
10443	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-23", "leaveType": "unpaid", "startDate": "2025-11-23"}	22	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
10445	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-30", "leaveType": "unpaid", "startDate": "2025-11-30"}	22	\N	\N	2025-11-30 07:00:00+07	2025-11-30 07:00:00+07	\N	\N	\N	\N
10446	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-16", "leaveType": "unpaid", "startDate": "2026-02-16"}	22	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10447	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-28", "leaveType": "unpaid", "startDate": "2025-10-28"}	22	\N	\N	2025-10-28 07:00:00+07	2025-10-28 07:00:00+07	\N	\N	\N	\N
10448	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-05", "leaveType": "unpaid", "startDate": "2026-02-05"}	22	\N	\N	2026-02-05 07:00:00+07	2026-02-05 07:00:00+07	\N	\N	\N	\N
10451	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-15", "leaveType": "unpaid", "startDate": "2026-02-15"}	23	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10452	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-24", "leaveType": "unpaid", "startDate": "2026-01-24"}	23	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
10453	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-12", "leaveType": "unpaid", "startDate": "2026-02-12"}	23	\N	\N	2026-02-12 07:00:00+07	2026-02-12 07:00:00+07	\N	\N	\N	\N
10455	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-03", "leaveType": "unpaid", "startDate": "2025-11-03"}	23	\N	\N	2025-11-03 07:00:00+07	2025-11-03 07:00:00+07	\N	\N	\N	\N
10456	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-09", "leaveType": "unpaid", "startDate": "2025-10-09"}	23	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
10457	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-18", "leaveType": "unpaid", "startDate": "2025-11-18"}	23	\N	\N	2025-11-18 07:00:00+07	2025-11-18 07:00:00+07	\N	\N	\N	\N
10458	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-26", "leaveType": "unpaid", "startDate": "2025-10-26"}	23	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
10459	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-31", "leaveType": "unpaid", "startDate": "2026-01-31"}	23	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
10460	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-23", "leaveType": "unpaid", "startDate": "2026-02-23"}	23	\N	\N	2026-02-23 07:00:00+07	2026-02-23 07:00:00+07	\N	\N	\N	\N
10461	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-09", "leaveType": "unpaid", "startDate": "2026-02-09"}	24	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10462	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-25", "leaveType": "unpaid", "startDate": "2025-10-25"}	24	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
10463	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-13", "leaveType": "unpaid", "startDate": "2025-10-13"}	24	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
10464	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-13", "leaveType": "unpaid", "startDate": "2026-02-13"}	24	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10465	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-09", "leaveType": "unpaid", "startDate": "2026-01-09"}	24	\N	\N	2026-01-09 07:00:00+07	2026-01-09 07:00:00+07	\N	\N	\N	\N
10467	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-10", "leaveType": "unpaid", "startDate": "2026-02-10"}	24	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10470	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-17", "leaveType": "unpaid", "startDate": "2025-11-17"}	25	\N	\N	2025-11-17 07:00:00+07	2025-11-17 07:00:00+07	\N	\N	\N	\N
10471	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-11", "leaveType": "unpaid", "startDate": "2026-02-11"}	25	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
10472	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-23", "leaveType": "unpaid", "startDate": "2026-02-23"}	25	\N	\N	2026-02-23 07:00:00+07	2026-02-23 07:00:00+07	\N	\N	\N	\N
10473	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-10", "leaveType": "unpaid", "startDate": "2025-10-10"}	25	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
10444	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-01", "leaveType": "sick", "startDate": "2025-12-01"}	22	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
10466	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-22", "leaveType": "sick", "startDate": "2026-02-22"}	24	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10477	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-31", "leaveType": "annual", "startDate": "2026-01-31"}	25	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
10478	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-17", "leaveType": "annual", "startDate": "2025-10-17"}	25	\N	\N	2025-10-17 07:00:00+07	2025-10-17 07:00:00+07	\N	\N	\N	\N
10479	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-11", "leaveType": "annual", "startDate": "2025-11-11"}	25	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
10482	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-15", "leaveType": "annual", "startDate": "2025-12-15"}	26	\N	\N	2025-12-15 07:00:00+07	2025-12-15 07:00:00+07	\N	\N	\N	\N
10483	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-26", "leaveType": "annual", "startDate": "2026-01-26"}	26	\N	\N	2026-01-26 07:00:00+07	2026-01-26 07:00:00+07	\N	\N	\N	\N
10491	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-13", "leaveType": "annual", "startDate": "2026-02-13"}	26	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10492	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-03", "leaveType": "annual", "startDate": "2025-11-03"}	26	\N	\N	2025-11-03 07:00:00+07	2025-11-03 07:00:00+07	\N	\N	\N	\N
10495	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-20", "leaveType": "annual", "startDate": "2026-01-20"}	27	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10501	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-31", "leaveType": "annual", "startDate": "2026-01-31"}	27	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
10476	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-24", "leaveType": "unpaid", "startDate": "2025-12-24"}	25	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
10481	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-07", "leaveType": "unpaid", "startDate": "2026-01-07"}	25	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
10484	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-08", "leaveType": "unpaid", "startDate": "2025-12-08"}	26	\N	\N	2025-12-08 07:00:00+07	2025-12-08 07:00:00+07	\N	\N	\N	\N
10485	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-01", "leaveType": "unpaid", "startDate": "2025-11-01"}	26	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
10487	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-01", "leaveType": "unpaid", "startDate": "2025-12-01"}	26	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
10488	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-07", "leaveType": "unpaid", "startDate": "2026-01-07"}	26	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
10489	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-01", "leaveType": "unpaid", "startDate": "2025-12-01"}	26	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
10490	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-03", "leaveType": "unpaid", "startDate": "2026-02-03"}	26	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
10493	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-21", "leaveType": "unpaid", "startDate": "2026-01-21"}	27	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
10494	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-20", "leaveType": "unpaid", "startDate": "2025-10-20"}	27	\N	\N	2025-10-20 07:00:00+07	2025-10-20 07:00:00+07	\N	\N	\N	\N
10496	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-31", "leaveType": "unpaid", "startDate": "2026-01-31"}	27	\N	\N	2026-01-31 07:00:00+07	2026-01-31 07:00:00+07	\N	\N	\N	\N
10497	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-03", "leaveType": "unpaid", "startDate": "2025-12-03"}	27	\N	\N	2025-12-03 07:00:00+07	2025-12-03 07:00:00+07	\N	\N	\N	\N
10498	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-23", "leaveType": "unpaid", "startDate": "2025-10-23"}	27	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
10499	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-06", "leaveType": "unpaid", "startDate": "2026-01-06"}	27	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
10502	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-15", "leaveType": "unpaid", "startDate": "2025-10-15"}	27	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
10503	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-30", "leaveType": "unpaid", "startDate": "2025-12-30"}	27	\N	\N	2025-12-30 07:00:00+07	2025-12-30 07:00:00+07	\N	\N	\N	\N
10504	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-16", "leaveType": "unpaid", "startDate": "2025-10-16"}	28	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
10505	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-13", "leaveType": "unpaid", "startDate": "2025-10-13"}	28	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
10506	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-10", "leaveType": "unpaid", "startDate": "2026-01-10"}	28	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
10507	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-05", "leaveType": "unpaid", "startDate": "2026-01-05"}	28	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10508	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-13", "leaveType": "unpaid", "startDate": "2026-02-13"}	28	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10509	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-23", "leaveType": "unpaid", "startDate": "2025-12-23"}	28	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
10480	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-29", "leaveType": "sick", "startDate": "2025-12-29"}	25	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
10486	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-01-13", "leaveType": "sick", "startDate": "2026-01-13"}	26	\N	\N	2026-01-13 07:00:00+07	2026-01-13 07:00:00+07	\N	\N	\N	\N
10500	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-20", "leaveType": "sick", "startDate": "2025-10-20"}	27	\N	\N	2025-10-20 07:00:00+07	2025-10-20 07:00:00+07	\N	\N	\N	\N
10521	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-10", "leaveType": "annual", "startDate": "2026-01-10"}	29	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
10522	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-05", "leaveType": "annual", "startDate": "2025-11-05"}	29	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
10524	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-05", "leaveType": "annual", "startDate": "2025-10-05"}	30	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
10532	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-03", "leaveType": "annual", "startDate": "2025-10-03"}	31	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
10534	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-23", "leaveType": "annual", "startDate": "2025-12-23"}	31	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
10536	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-22", "leaveType": "annual", "startDate": "2026-02-22"}	31	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10511	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-24", "leaveType": "unpaid", "startDate": "2025-10-24"}	28	\N	\N	2025-10-24 07:00:00+07	2025-10-24 07:00:00+07	\N	\N	\N	\N
10512	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-19", "leaveType": "unpaid", "startDate": "2025-11-19"}	28	\N	\N	2025-11-19 07:00:00+07	2025-11-19 07:00:00+07	\N	\N	\N	\N
10513	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-26", "leaveType": "unpaid", "startDate": "2025-10-26"}	29	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
10514	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-27", "leaveType": "unpaid", "startDate": "2025-10-27"}	29	\N	\N	2025-10-27 07:00:00+07	2025-10-27 07:00:00+07	\N	\N	\N	\N
10515	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-20", "leaveType": "unpaid", "startDate": "2025-11-20"}	29	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
10516	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-16", "leaveType": "unpaid", "startDate": "2026-01-16"}	29	\N	\N	2026-01-16 07:00:00+07	2026-01-16 07:00:00+07	\N	\N	\N	\N
10517	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-05", "leaveType": "unpaid", "startDate": "2025-10-05"}	29	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
10518	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-29", "leaveType": "unpaid", "startDate": "2025-12-29"}	29	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
10519	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-19", "leaveType": "unpaid", "startDate": "2025-10-19"}	29	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10520	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-18", "leaveType": "unpaid", "startDate": "2025-10-18"}	29	\N	\N	2025-10-18 07:00:00+07	2025-10-18 07:00:00+07	\N	\N	\N	\N
10523	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-26", "leaveType": "unpaid", "startDate": "2025-11-26"}	29	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
10525	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-01", "leaveType": "unpaid", "startDate": "2026-01-01"}	30	\N	\N	2026-01-01 07:00:00+07	2026-01-01 07:00:00+07	\N	\N	\N	\N
10526	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-05", "leaveType": "unpaid", "startDate": "2026-02-05"}	30	\N	\N	2026-02-05 07:00:00+07	2026-02-05 07:00:00+07	\N	\N	\N	\N
10528	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-09", "leaveType": "unpaid", "startDate": "2025-10-09"}	30	\N	\N	2025-10-09 07:00:00+07	2025-10-09 07:00:00+07	\N	\N	\N	\N
10529	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-28", "leaveType": "unpaid", "startDate": "2025-11-28"}	30	\N	\N	2025-11-28 07:00:00+07	2025-11-28 07:00:00+07	\N	\N	\N	\N
10530	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-16", "leaveType": "unpaid", "startDate": "2025-10-16"}	30	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
10533	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-13", "leaveType": "unpaid", "startDate": "2026-01-13"}	31	\N	\N	2026-01-13 07:00:00+07	2026-01-13 07:00:00+07	\N	\N	\N	\N
10537	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-20", "leaveType": "unpaid", "startDate": "2026-01-20"}	31	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10538	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-20", "leaveType": "unpaid", "startDate": "2025-11-20"}	31	\N	\N	2025-11-20 07:00:00+07	2025-11-20 07:00:00+07	\N	\N	\N	\N
10539	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-04", "leaveType": "unpaid", "startDate": "2025-11-04"}	31	\N	\N	2025-11-04 07:00:00+07	2025-11-04 07:00:00+07	\N	\N	\N	\N
10540	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-08", "leaveType": "unpaid", "startDate": "2026-02-08"}	31	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
10542	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-30", "leaveType": "unpaid", "startDate": "2025-11-30"}	32	\N	\N	2025-11-30 07:00:00+07	2025-11-30 07:00:00+07	\N	\N	\N	\N
10543	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-29", "leaveType": "unpaid", "startDate": "2025-10-29"}	32	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
10544	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-07", "leaveType": "unpaid", "startDate": "2025-12-07"}	32	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
10535	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-13", "leaveType": "sick", "startDate": "2026-02-13"}	31	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10541	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-27", "leaveType": "sick", "startDate": "2025-12-27"}	31	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
10546	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-06", "leaveType": "annual", "startDate": "2025-10-06"}	32	\N	\N	2025-10-06 07:00:00+07	2025-10-06 07:00:00+07	\N	\N	\N	\N
10547	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-16", "leaveType": "annual", "startDate": "2025-10-16"}	32	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
10549	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-07", "leaveType": "annual", "startDate": "2025-12-07"}	32	\N	\N	2025-12-07 07:00:00+07	2025-12-07 07:00:00+07	\N	\N	\N	\N
10555	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-13", "leaveType": "annual", "startDate": "2025-12-13"}	33	\N	\N	2025-12-13 07:00:00+07	2025-12-13 07:00:00+07	\N	\N	\N	\N
10560	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-12", "leaveType": "annual", "startDate": "2026-01-12"}	33	\N	\N	2026-01-12 07:00:00+07	2026-01-12 07:00:00+07	\N	\N	\N	\N
10565	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-26", "leaveType": "annual", "startDate": "2025-12-26"}	34	\N	\N	2025-12-26 07:00:00+07	2025-12-26 07:00:00+07	\N	\N	\N	\N
10571	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-19", "leaveType": "annual", "startDate": "2026-02-19"}	34	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
10573	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-02", "leaveType": "annual", "startDate": "2026-02-02"}	35	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
10575	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-02", "leaveType": "annual", "startDate": "2026-02-02"}	35	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
10578	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-24", "leaveType": "annual", "startDate": "2026-01-24"}	35	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
10548	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-09", "leaveType": "unpaid", "startDate": "2026-02-09"}	32	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10550	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-28"}	32	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
10551	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-16", "leaveType": "unpaid", "startDate": "2025-12-16"}	32	\N	\N	2025-12-16 07:00:00+07	2025-12-16 07:00:00+07	\N	\N	\N	\N
10552	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-09", "leaveType": "unpaid", "startDate": "2025-11-09"}	32	\N	\N	2025-11-09 07:00:00+07	2025-11-09 07:00:00+07	\N	\N	\N	\N
10553	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-22", "leaveType": "unpaid", "startDate": "2026-02-22"}	32	\N	\N	2026-02-22 07:00:00+07	2026-02-22 07:00:00+07	\N	\N	\N	\N
10554	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-29", "leaveType": "unpaid", "startDate": "2025-10-29"}	33	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
10556	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-13", "leaveType": "unpaid", "startDate": "2025-10-13"}	33	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
10557	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-27", "leaveType": "unpaid", "startDate": "2025-11-27"}	33	\N	\N	2025-11-27 07:00:00+07	2025-11-27 07:00:00+07	\N	\N	\N	\N
10558	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-05", "leaveType": "unpaid", "startDate": "2025-11-05"}	33	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
10559	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-20", "leaveType": "unpaid", "startDate": "2026-01-20"}	33	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10562	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-24", "leaveType": "unpaid", "startDate": "2025-11-24"}	33	\N	\N	2025-11-24 07:00:00+07	2025-11-24 07:00:00+07	\N	\N	\N	\N
10563	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-11", "leaveType": "unpaid", "startDate": "2025-11-11"}	33	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
10564	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-07", "leaveType": "unpaid", "startDate": "2026-02-07"}	33	\N	\N	2026-02-07 07:00:00+07	2026-02-07 07:00:00+07	\N	\N	\N	\N
10566	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-21", "leaveType": "unpaid", "startDate": "2025-12-21"}	34	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
10567	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-19", "leaveType": "unpaid", "startDate": "2025-10-19"}	34	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10568	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-05", "leaveType": "unpaid", "startDate": "2026-01-05"}	34	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10569	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-04", "leaveType": "unpaid", "startDate": "2025-12-04"}	34	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
10574	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-21", "leaveType": "unpaid", "startDate": "2026-02-21"}	35	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10576	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-17", "leaveType": "unpaid", "startDate": "2025-11-17"}	35	\N	\N	2025-11-17 07:00:00+07	2025-11-17 07:00:00+07	\N	\N	\N	\N
10577	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-12", "leaveType": "unpaid", "startDate": "2026-01-12"}	35	\N	\N	2026-01-12 07:00:00+07	2026-01-12 07:00:00+07	\N	\N	\N	\N
10579	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-08", "leaveType": "unpaid", "startDate": "2025-10-08"}	35	\N	\N	2025-10-08 07:00:00+07	2025-10-08 07:00:00+07	\N	\N	\N	\N
10580	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-01", "leaveType": "unpaid", "startDate": "2026-01-01"}	35	\N	\N	2026-01-01 07:00:00+07	2026-01-01 07:00:00+07	\N	\N	\N	\N
10561	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-03", "leaveType": "sick", "startDate": "2026-02-03"}	33	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
10570	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-13", "leaveType": "sick", "startDate": "2026-02-13"}	34	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10572	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-03", "leaveType": "sick", "startDate": "2026-02-03"}	34	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
10589	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-31", "leaveType": "annual", "startDate": "2025-12-31"}	36	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
10584	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-29", "leaveType": "unpaid", "startDate": "2025-10-29"}	36	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
10585	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-04", "leaveType": "unpaid", "startDate": "2025-11-04"}	36	\N	\N	2025-11-04 07:00:00+07	2025-11-04 07:00:00+07	\N	\N	\N	\N
10590	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-29", "leaveType": "unpaid", "startDate": "2025-12-29"}	36	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
10591	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-24", "leaveType": "unpaid", "startDate": "2026-01-24"}	36	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
10592	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-06", "leaveType": "unpaid", "startDate": "2026-02-06"}	37	\N	\N	2026-02-06 07:00:00+07	2026-02-06 07:00:00+07	\N	\N	\N	\N
10593	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-29", "leaveType": "unpaid", "startDate": "2025-12-29"}	37	\N	\N	2025-12-29 07:00:00+07	2025-12-29 07:00:00+07	\N	\N	\N	\N
10594	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-03", "leaveType": "unpaid", "startDate": "2025-10-03"}	37	\N	\N	2025-10-03 07:00:00+07	2025-10-03 07:00:00+07	\N	\N	\N	\N
10595	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-01", "leaveType": "unpaid", "startDate": "2025-12-01"}	37	\N	\N	2025-12-01 07:00:00+07	2025-12-01 07:00:00+07	\N	\N	\N	\N
10596	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-12", "leaveType": "unpaid", "startDate": "2026-02-12"}	37	\N	\N	2026-02-12 07:00:00+07	2026-02-12 07:00:00+07	\N	\N	\N	\N
10597	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-03", "leaveType": "unpaid", "startDate": "2026-01-03"}	37	\N	\N	2026-01-03 07:00:00+07	2026-01-03 07:00:00+07	\N	\N	\N	\N
10598	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-23", "leaveType": "unpaid", "startDate": "2025-10-23"}	37	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
10599	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-14", "leaveType": "unpaid", "startDate": "2026-02-14"}	37	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
10600	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-15", "leaveType": "unpaid", "startDate": "2026-02-15"}	37	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10602	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-26", "leaveType": "unpaid", "startDate": "2025-12-26"}	37	\N	\N	2025-12-26 07:00:00+07	2025-12-26 07:00:00+07	\N	\N	\N	\N
10604	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-29", "leaveType": "unpaid", "startDate": "2025-11-29"}	38	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
10605	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-25", "leaveType": "unpaid", "startDate": "2025-12-25"}	38	\N	\N	2025-12-25 07:00:00+07	2025-12-25 07:00:00+07	\N	\N	\N	\N
10606	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-28", "leaveType": "unpaid", "startDate": "2025-10-28"}	38	\N	\N	2025-10-28 07:00:00+07	2025-10-28 07:00:00+07	\N	\N	\N	\N
10607	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-26", "leaveType": "unpaid", "startDate": "2025-11-26"}	38	\N	\N	2025-11-26 07:00:00+07	2025-11-26 07:00:00+07	\N	\N	\N	\N
10608	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-11", "leaveType": "unpaid", "startDate": "2025-11-11"}	38	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
10609	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-19", "leaveType": "unpaid", "startDate": "2025-10-19"}	38	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10610	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-25", "leaveType": "unpaid", "startDate": "2025-12-25"}	38	\N	\N	2025-12-25 07:00:00+07	2025-12-25 07:00:00+07	\N	\N	\N	\N
10611	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-05", "leaveType": "unpaid", "startDate": "2026-02-05"}	38	\N	\N	2026-02-05 07:00:00+07	2026-02-05 07:00:00+07	\N	\N	\N	\N
10612	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-09", "leaveType": "unpaid", "startDate": "2026-02-09"}	38	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10613	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-08", "leaveType": "unpaid", "startDate": "2025-12-08"}	38	\N	\N	2025-12-08 07:00:00+07	2025-12-08 07:00:00+07	\N	\N	\N	\N
10614	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-24", "leaveType": "unpaid", "startDate": "2025-12-24"}	38	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
10615	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-30", "leaveType": "unpaid", "startDate": "2025-10-30"}	39	\N	\N	2025-10-30 07:00:00+07	2025-10-30 07:00:00+07	\N	\N	\N	\N
10581	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-04", "leaveType": "sick", "startDate": "2026-02-04"}	35	\N	\N	2026-02-04 07:00:00+07	2026-02-04 07:00:00+07	\N	\N	\N	\N
10582	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-08", "leaveType": "sick", "startDate": "2026-02-08"}	35	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
10586	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-07", "leaveType": "sick", "startDate": "2025-10-07"}	36	\N	\N	2025-10-07 07:00:00+07	2025-10-07 07:00:00+07	\N	\N	\N	\N
10587	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-02", "leaveType": "sick", "startDate": "2025-11-02"}	36	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
10588	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-01-09", "leaveType": "sick", "startDate": "2026-01-09"}	36	\N	\N	2026-01-09 07:00:00+07	2026-01-09 07:00:00+07	\N	\N	\N	\N
10601	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-18", "leaveType": "sick", "startDate": "2025-10-18"}	37	\N	\N	2025-10-18 07:00:00+07	2025-10-18 07:00:00+07	\N	\N	\N	\N
10603	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-09", "leaveType": "sick", "startDate": "2026-02-09"}	37	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10616	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-08", "leaveType": "annual", "startDate": "2026-02-08"}	39	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
10622	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-16", "leaveType": "annual", "startDate": "2025-10-16"}	39	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
10633	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-01", "leaveType": "annual", "startDate": "2026-02-01"}	40	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10636	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-05", "leaveType": "annual", "startDate": "2025-11-05"}	40	\N	\N	2025-11-05 07:00:00+07	2025-11-05 07:00:00+07	\N	\N	\N	\N
10645	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-22", "leaveType": "annual", "startDate": "2025-11-22"}	41	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
10648	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-23", "leaveType": "annual", "startDate": "2026-01-23"}	41	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
10618	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-08", "leaveType": "unpaid", "startDate": "2025-12-08"}	39	\N	\N	2025-12-08 07:00:00+07	2025-12-08 07:00:00+07	\N	\N	\N	\N
10619	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-19", "leaveType": "unpaid", "startDate": "2025-11-19"}	39	\N	\N	2025-11-19 07:00:00+07	2025-11-19 07:00:00+07	\N	\N	\N	\N
10620	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-04", "leaveType": "unpaid", "startDate": "2025-10-04"}	39	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
10624	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-10", "leaveType": "unpaid", "startDate": "2025-10-10"}	39	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
10625	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-24", "leaveType": "unpaid", "startDate": "2026-01-24"}	39	\N	\N	2026-01-24 07:00:00+07	2026-01-24 07:00:00+07	\N	\N	\N	\N
10626	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-09", "leaveType": "unpaid", "startDate": "2026-02-09"}	40	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10628	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-12", "leaveType": "unpaid", "startDate": "2026-01-12"}	40	\N	\N	2026-01-12 07:00:00+07	2026-01-12 07:00:00+07	\N	\N	\N	\N
10629	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-13", "leaveType": "unpaid", "startDate": "2026-02-13"}	40	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10630	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-20", "leaveType": "unpaid", "startDate": "2026-01-20"}	40	\N	\N	2026-01-20 07:00:00+07	2026-01-20 07:00:00+07	\N	\N	\N	\N
10631	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-28", "leaveType": "unpaid", "startDate": "2025-12-28"}	40	\N	\N	2025-12-28 07:00:00+07	2025-12-28 07:00:00+07	\N	\N	\N	\N
10632	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-31", "leaveType": "unpaid", "startDate": "2025-12-31"}	40	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
10634	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-06", "leaveType": "unpaid", "startDate": "2025-12-06"}	40	\N	\N	2025-12-06 07:00:00+07	2025-12-06 07:00:00+07	\N	\N	\N	\N
10635	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-22", "leaveType": "unpaid", "startDate": "2025-12-22"}	40	\N	\N	2025-12-22 07:00:00+07	2025-12-22 07:00:00+07	\N	\N	\N	\N
10637	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-06", "leaveType": "unpaid", "startDate": "2025-11-06"}	40	\N	\N	2025-11-06 07:00:00+07	2025-11-06 07:00:00+07	\N	\N	\N	\N
10639	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-29", "leaveType": "unpaid", "startDate": "2025-10-29"}	41	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
10640	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-23", "leaveType": "unpaid", "startDate": "2026-01-23"}	41	\N	\N	2026-01-23 07:00:00+07	2026-01-23 07:00:00+07	\N	\N	\N	\N
10641	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-29", "leaveType": "unpaid", "startDate": "2025-11-29"}	41	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
10642	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-09", "leaveType": "unpaid", "startDate": "2026-02-09"}	41	\N	\N	2026-02-09 07:00:00+07	2026-02-09 07:00:00+07	\N	\N	\N	\N
10644	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-06", "leaveType": "unpaid", "startDate": "2025-12-06"}	41	\N	\N	2025-12-06 07:00:00+07	2025-12-06 07:00:00+07	\N	\N	\N	\N
10646	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-07", "leaveType": "unpaid", "startDate": "2026-01-07"}	41	\N	\N	2026-01-07 07:00:00+07	2026-01-07 07:00:00+07	\N	\N	\N	\N
10647	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-02", "leaveType": "unpaid", "startDate": "2026-02-02"}	41	\N	\N	2026-02-02 07:00:00+07	2026-02-02 07:00:00+07	\N	\N	\N	\N
10649	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-18", "leaveType": "unpaid", "startDate": "2025-12-18"}	41	\N	\N	2025-12-18 07:00:00+07	2025-12-18 07:00:00+07	\N	\N	\N	\N
10650	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-23", "leaveType": "unpaid", "startDate": "2025-10-23"}	42	\N	\N	2025-10-23 07:00:00+07	2025-10-23 07:00:00+07	\N	\N	\N	\N
10621	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-01", "leaveType": "sick", "startDate": "2025-11-01"}	39	\N	\N	2025-11-01 07:00:00+07	2025-11-01 07:00:00+07	\N	\N	\N	\N
10623	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-10", "leaveType": "sick", "startDate": "2025-10-10"}	39	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
10638	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-21", "leaveType": "sick", "startDate": "2025-12-21"}	41	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
10655	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-21", "leaveType": "annual", "startDate": "2025-12-21"}	42	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
10657	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-22", "leaveType": "annual", "startDate": "2025-11-22"}	42	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
10664	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-12-19", "leaveType": "annual", "startDate": "2025-12-19"}	43	\N	\N	2025-12-19 07:00:00+07	2025-12-19 07:00:00+07	\N	\N	\N	\N
10667	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-21", "leaveType": "annual", "startDate": "2025-10-21"}	43	\N	\N	2025-10-21 07:00:00+07	2025-10-21 07:00:00+07	\N	\N	\N	\N
10668	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-17", "leaveType": "annual", "startDate": "2025-11-17"}	43	\N	\N	2025-11-17 07:00:00+07	2025-11-17 07:00:00+07	\N	\N	\N	\N
10672	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-02", "leaveType": "annual", "startDate": "2025-11-02"}	44	\N	\N	2025-11-02 07:00:00+07	2025-11-02 07:00:00+07	\N	\N	\N	\N
10675	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-11", "leaveType": "annual", "startDate": "2025-11-11"}	44	\N	\N	2025-11-11 07:00:00+07	2025-11-11 07:00:00+07	\N	\N	\N	\N
10679	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-21", "leaveType": "annual", "startDate": "2026-01-21"}	45	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
10683	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-25", "leaveType": "annual", "startDate": "2025-10-25"}	45	\N	\N	2025-10-25 07:00:00+07	2025-10-25 07:00:00+07	\N	\N	\N	\N
10652	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-22", "leaveType": "unpaid", "startDate": "2025-11-22"}	42	\N	\N	2025-11-22 07:00:00+07	2025-11-22 07:00:00+07	\N	\N	\N	\N
10653	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-26", "leaveType": "unpaid", "startDate": "2026-01-26"}	42	\N	\N	2026-01-26 07:00:00+07	2026-01-26 07:00:00+07	\N	\N	\N	\N
10654	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-26", "leaveType": "unpaid", "startDate": "2026-02-26"}	42	\N	\N	2026-02-26 07:00:00+07	2026-02-26 07:00:00+07	\N	\N	\N	\N
10658	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-28", "leaveType": "unpaid", "startDate": "2025-10-28"}	42	\N	\N	2025-10-28 07:00:00+07	2025-10-28 07:00:00+07	\N	\N	\N	\N
10659	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-05", "leaveType": "unpaid", "startDate": "2026-01-05"}	43	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10660	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-15", "leaveType": "unpaid", "startDate": "2026-02-15"}	43	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10661	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-04", "leaveType": "unpaid", "startDate": "2026-01-04"}	43	\N	\N	2026-01-04 07:00:00+07	2026-01-04 07:00:00+07	\N	\N	\N	\N
10662	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-08", "leaveType": "unpaid", "startDate": "2025-11-08"}	43	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
10663	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-29", "leaveType": "unpaid", "startDate": "2025-10-29"}	43	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
10665	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-20", "leaveType": "unpaid", "startDate": "2026-02-20"}	43	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10666	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-31", "leaveType": "unpaid", "startDate": "2025-10-31"}	43	\N	\N	2025-10-31 07:00:00+07	2025-10-31 07:00:00+07	\N	\N	\N	\N
10669	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-27", "leaveType": "unpaid", "startDate": "2026-01-27"}	44	\N	\N	2026-01-27 07:00:00+07	2026-01-27 07:00:00+07	\N	\N	\N	\N
10670	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-15", "leaveType": "unpaid", "startDate": "2025-10-15"}	44	\N	\N	2025-10-15 07:00:00+07	2025-10-15 07:00:00+07	\N	\N	\N	\N
10671	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-12", "leaveType": "unpaid", "startDate": "2025-10-12"}	44	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
10673	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-04", "leaveType": "unpaid", "startDate": "2025-11-04"}	44	\N	\N	2025-11-04 07:00:00+07	2025-11-04 07:00:00+07	\N	\N	\N	\N
10674	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-21", "leaveType": "unpaid", "startDate": "2026-01-21"}	44	\N	\N	2026-01-21 07:00:00+07	2026-01-21 07:00:00+07	\N	\N	\N	\N
10676	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-06", "leaveType": "unpaid", "startDate": "2026-01-06"}	44	\N	\N	2026-01-06 07:00:00+07	2026-01-06 07:00:00+07	\N	\N	\N	\N
10677	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-29", "leaveType": "unpaid", "startDate": "2025-10-29"}	44	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
10678	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-30", "leaveType": "unpaid", "startDate": "2026-01-30"}	45	\N	\N	2026-01-30 07:00:00+07	2026-01-30 07:00:00+07	\N	\N	\N	\N
10681	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-31", "leaveType": "unpaid", "startDate": "2025-12-31"}	45	\N	\N	2025-12-31 07:00:00+07	2025-12-31 07:00:00+07	\N	\N	\N	\N
10682	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-27", "leaveType": "unpaid", "startDate": "2025-12-27"}	45	\N	\N	2025-12-27 07:00:00+07	2025-12-27 07:00:00+07	\N	\N	\N	\N
10684	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-05", "leaveType": "unpaid", "startDate": "2025-10-05"}	45	\N	\N	2025-10-05 07:00:00+07	2025-10-05 07:00:00+07	\N	\N	\N	\N
10685	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-20", "leaveType": "unpaid", "startDate": "2025-12-20"}	45	\N	\N	2025-12-20 07:00:00+07	2025-12-20 07:00:00+07	\N	\N	\N	\N
10686	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-25", "leaveType": "unpaid", "startDate": "2025-12-25"}	45	\N	\N	2025-12-25 07:00:00+07	2025-12-25 07:00:00+07	\N	\N	\N	\N
10656	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-17", "leaveType": "sick", "startDate": "2026-02-17"}	42	\N	\N	2026-02-17 07:00:00+07	2026-02-17 07:00:00+07	\N	\N	\N	\N
10680	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-20", "leaveType": "sick", "startDate": "2025-10-20"}	45	\N	\N	2025-10-20 07:00:00+07	2025-10-20 07:00:00+07	\N	\N	\N	\N
10687	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-30", "leaveType": "annual", "startDate": "2025-10-30"}	45	\N	\N	2025-10-30 07:00:00+07	2025-10-30 07:00:00+07	\N	\N	\N	\N
10691	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-11-30", "leaveType": "annual", "startDate": "2025-11-30"}	46	\N	\N	2025-11-30 07:00:00+07	2025-11-30 07:00:00+07	\N	\N	\N	\N
10707	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-12", "leaveType": "annual", "startDate": "2025-10-12"}	47	\N	\N	2025-10-12 07:00:00+07	2025-10-12 07:00:00+07	\N	\N	\N	\N
10709	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-02-21", "leaveType": "annual", "startDate": "2026-02-21"}	47	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
9363	business-trip	1	{"reason": "Họp đối tác chiến lược", "endTime": "2026-02-20 17:00", "startTime": "2026-02-18 08:00", "destination": "Hồ Chí Minh", "contactPerson": "Mr. A"}	1	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10050	overtime	1	{"date": "2026-02-18", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	45	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
10051	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	45	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10052	overtime	1	{"date": "2026-02-04", "reason": "Xử lý công việc tồn đọng", "endTime": "20:14", "startTime": "17:00", "totalHours": 3.2}	46	\N	\N	2026-02-04 07:00:00+07	2026-02-04 07:00:00+07	\N	\N	\N	\N
10053	overtime	1	{"date": "2026-02-08", "reason": "Chạy dự án cuối tuần", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	46	\N	\N	2026-02-08 07:00:00+07	2026-02-08 07:00:00+07	\N	\N	\N	\N
10054	overtime	1	{"date": "2026-02-11", "reason": "Trực lễ test", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	46	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
10055	overtime	1	{"date": "2026-02-20", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	46	\N	\N	2026-02-20 07:00:00+07	2026-02-20 07:00:00+07	\N	\N	\N	\N
10056	overtime	1	{"date": "2026-02-11", "reason": "Trực lễ test", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	47	\N	\N	2026-02-11 07:00:00+07	2026-02-11 07:00:00+07	\N	\N	\N	\N
10689	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-04", "leaveType": "unpaid", "startDate": "2025-12-04"}	45	\N	\N	2025-12-04 07:00:00+07	2025-12-04 07:00:00+07	\N	\N	\N	\N
10690	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-21", "leaveType": "unpaid", "startDate": "2025-12-21"}	46	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
10692	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-23", "leaveType": "unpaid", "startDate": "2025-11-23"}	46	\N	\N	2025-11-23 07:00:00+07	2025-11-23 07:00:00+07	\N	\N	\N	\N
10694	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-15", "leaveType": "unpaid", "startDate": "2026-02-15"}	46	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10695	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-18", "leaveType": "unpaid", "startDate": "2026-02-18"}	46	\N	\N	2026-02-18 07:00:00+07	2026-02-18 07:00:00+07	\N	\N	\N	\N
10696	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-06", "leaveType": "unpaid", "startDate": "2025-11-06"}	46	\N	\N	2025-11-06 07:00:00+07	2025-11-06 07:00:00+07	\N	\N	\N	\N
10697	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-14", "leaveType": "unpaid", "startDate": "2025-10-14"}	46	\N	\N	2025-10-14 07:00:00+07	2025-10-14 07:00:00+07	\N	\N	\N	\N
10698	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-10", "leaveType": "unpaid", "startDate": "2025-10-10"}	46	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
10699	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-26", "leaveType": "unpaid", "startDate": "2026-02-26"}	47	\N	\N	2026-02-26 07:00:00+07	2026-02-26 07:00:00+07	\N	\N	\N	\N
10700	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-23", "leaveType": "unpaid", "startDate": "2025-12-23"}	47	\N	\N	2025-12-23 07:00:00+07	2025-12-23 07:00:00+07	\N	\N	\N	\N
10703	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-16", "leaveType": "unpaid", "startDate": "2025-10-16"}	47	\N	\N	2025-10-16 07:00:00+07	2025-10-16 07:00:00+07	\N	\N	\N	\N
10704	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-05", "leaveType": "unpaid", "startDate": "2026-01-05"}	47	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10705	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-26", "leaveType": "unpaid", "startDate": "2025-10-26"}	47	\N	\N	2025-10-26 07:00:00+07	2025-10-26 07:00:00+07	\N	\N	\N	\N
10706	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-21", "leaveType": "unpaid", "startDate": "2025-10-21"}	47	\N	\N	2025-10-21 07:00:00+07	2025-10-21 07:00:00+07	\N	\N	\N	\N
10708	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-28", "leaveType": "unpaid", "startDate": "2026-02-28"}	47	\N	\N	2026-02-28 07:00:00+07	2026-02-28 07:00:00+07	\N	\N	\N	\N
10710	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-08", "leaveType": "unpaid", "startDate": "2025-11-08"}	48	\N	\N	2025-11-08 07:00:00+07	2025-11-08 07:00:00+07	\N	\N	\N	\N
10711	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-05", "leaveType": "unpaid", "startDate": "2026-01-05"}	48	\N	\N	2026-01-05 07:00:00+07	2026-01-05 07:00:00+07	\N	\N	\N	\N
10713	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-03", "leaveType": "unpaid", "startDate": "2025-11-03"}	48	\N	\N	2025-11-03 07:00:00+07	2025-11-03 07:00:00+07	\N	\N	\N	\N
10693	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-11-15", "leaveType": "sick", "startDate": "2025-11-15"}	46	\N	\N	2025-11-15 07:00:00+07	2025-11-15 07:00:00+07	\N	\N	\N	\N
10701	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-21", "leaveType": "sick", "startDate": "2025-12-21"}	47	\N	\N	2025-12-21 07:00:00+07	2025-12-21 07:00:00+07	\N	\N	\N	\N
10702	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-02-06", "leaveType": "sick", "startDate": "2026-02-06"}	47	\N	\N	2026-02-06 07:00:00+07	2026-02-06 07:00:00+07	\N	\N	\N	\N
10712	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-21", "leaveType": "sick", "startDate": "2025-10-21"}	48	\N	\N	2025-10-21 07:00:00+07	2025-10-21 07:00:00+07	\N	\N	\N	\N
10057	overtime	1	{"date": "2026-02-13", "reason": "Xử lý công việc tồn đọng", "endTime": "20:26", "startTime": "17:00", "totalHours": 3.4}	47	\N	\N	2026-02-13 07:00:00+07	2026-02-13 07:00:00+07	\N	\N	\N	\N
10058	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	47	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10059	overtime	1	{"date": "2026-02-19", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	47	\N	\N	2026-02-19 07:00:00+07	2026-02-19 07:00:00+07	\N	\N	\N	\N
10060	overtime	1	{"date": "2026-02-03", "reason": "Xử lý công việc tồn đọng", "endTime": "19:46", "startTime": "17:00", "totalHours": 2.8}	48	\N	\N	2026-02-03 07:00:00+07	2026-02-03 07:00:00+07	\N	\N	\N	\N
10061	overtime	1	{"date": "2026-02-21", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	48	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10062	overtime	1	{"date": "2026-02-14", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	49	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
10063	overtime	1	{"date": "2026-02-15", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	49	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10064	overtime	1	{"date": "2026-02-16", "reason": "Trực lễ Tết Nguyên Đán 2026 (Bính Ngọ)", "endTime": "17:00", "startTime": "08:00", "totalHours": 8}	49	\N	\N	2026-02-16 07:00:00+07	2026-02-16 07:00:00+07	\N	\N	\N	\N
10065	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm (Test Seed)", "endDate": "2026-02-03", "startDate": "2026-02-03"}	1	\N	\N	2026-02-01 07:00:00+07	2026-02-01 07:00:00+07	\N	\N	\N	\N
10069	business-trip	1	{"reason": "Công tác tại chi nhánh Hà Nội", "endDate": "2026-01-17", "location": "Hà Nội", "startDate": "2026-01-15"}	1	\N	\N	2026-01-10 07:00:00+07	2026-01-10 07:00:00+07	\N	\N	\N	\N
10070	business-trip	1	{"reason": "Tham dự hội thảo công nghệ", "endDate": "2026-02-22", "location": "Đà Nẵng", "startDate": "2026-02-20"}	3	\N	\N	2026-02-15 07:00:00+07	2026-02-15 07:00:00+07	\N	\N	\N	\N
10722	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-13", "leaveType": "annual", "startDate": "2025-10-13"}	49	\N	\N	2025-10-13 07:00:00+07	2025-10-13 07:00:00+07	\N	\N	\N	\N
10728	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2026-01-19", "leaveType": "annual", "startDate": "2026-01-19"}	49	\N	\N	2026-01-19 07:00:00+07	2026-01-19 07:00:00+07	\N	\N	\N	\N
10734	leave	1	{"isPaid": true, "reason": "Nghỉ phép năm", "endDate": "2025-10-10", "leaveType": "annual", "startDate": "2025-10-10"}	50	\N	\N	2025-10-10 07:00:00+07	2025-10-10 07:00:00+07	\N	\N	\N	\N
10714	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-22", "leaveType": "unpaid", "startDate": "2026-01-22"}	48	\N	\N	2026-01-22 07:00:00+07	2026-01-22 07:00:00+07	\N	\N	\N	\N
10716	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-21", "leaveType": "unpaid", "startDate": "2025-10-21"}	48	\N	\N	2025-10-21 07:00:00+07	2025-10-21 07:00:00+07	\N	\N	\N	\N
10718	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-10", "leaveType": "unpaid", "startDate": "2025-11-10"}	48	\N	\N	2025-11-10 07:00:00+07	2025-11-10 07:00:00+07	\N	\N	\N	\N
10719	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-29", "leaveType": "unpaid", "startDate": "2025-10-29"}	48	\N	\N	2025-10-29 07:00:00+07	2025-10-29 07:00:00+07	\N	\N	\N	\N
10720	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-12-24", "leaveType": "unpaid", "startDate": "2025-12-24"}	49	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
10721	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-01-11", "leaveType": "unpaid", "startDate": "2026-01-11"}	49	\N	\N	2026-01-11 07:00:00+07	2026-01-11 07:00:00+07	\N	\N	\N	\N
10723	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-14", "leaveType": "unpaid", "startDate": "2026-02-14"}	49	\N	\N	2026-02-14 07:00:00+07	2026-02-14 07:00:00+07	\N	\N	\N	\N
10725	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-11", "leaveType": "unpaid", "startDate": "2025-10-11"}	49	\N	\N	2025-10-11 07:00:00+07	2025-10-11 07:00:00+07	\N	\N	\N	\N
10726	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-17", "leaveType": "unpaid", "startDate": "2025-11-17"}	49	\N	\N	2025-11-17 07:00:00+07	2025-11-17 07:00:00+07	\N	\N	\N	\N
10727	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-10", "leaveType": "unpaid", "startDate": "2026-02-10"}	49	\N	\N	2026-02-10 07:00:00+07	2026-02-10 07:00:00+07	\N	\N	\N	\N
10730	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-04", "leaveType": "unpaid", "startDate": "2026-02-04"}	49	\N	\N	2026-02-04 07:00:00+07	2026-02-04 07:00:00+07	\N	\N	\N	\N
10731	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-10-19", "leaveType": "unpaid", "startDate": "2025-10-19"}	50	\N	\N	2025-10-19 07:00:00+07	2025-10-19 07:00:00+07	\N	\N	\N	\N
10732	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2026-02-21", "leaveType": "unpaid", "startDate": "2026-02-21"}	50	\N	\N	2026-02-21 07:00:00+07	2026-02-21 07:00:00+07	\N	\N	\N	\N
10733	leave	1	{"isPaid": false, "reason": "Nghỉ không lương (Bận việc riêng)", "endDate": "2025-11-29", "leaveType": "unpaid", "startDate": "2025-11-29"}	50	\N	\N	2025-11-29 07:00:00+07	2025-11-29 07:00:00+07	\N	\N	\N	\N
10715	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2026-01-17", "leaveType": "sick", "startDate": "2026-01-17"}	48	\N	\N	2026-01-17 07:00:00+07	2026-01-17 07:00:00+07	\N	\N	\N	\N
10717	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-10-04", "leaveType": "sick", "startDate": "2025-10-04"}	48	\N	\N	2025-10-04 07:00:00+07	2025-10-04 07:00:00+07	\N	\N	\N	\N
10724	leave	1	{"isPaid": true, "reason": "Nghỉ ốm (Có giấy BS)", "endDate": "2025-12-24", "leaveType": "sick", "startDate": "2025-12-24"}	49	\N	\N	2025-12-24 07:00:00+07	2025-12-24 07:00:00+07	\N	\N	\N	\N
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20250925061721_create_application_table.js	1	2025-09-27 01:14:29.573+07
6	20260122100000_add_fields_to_applications.js	2	2026-01-23 14:43:41.346+07
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Name: applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.applications_id_seq', 10740, true);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 6, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict RgaydLvRfb8SMouhXTljgrWlqvst6xV7sjAfSrBP7X9w6OQz3s3ZYKPLL5f11WZ

