--
-- PostgreSQL database dump
--

\restrict U2FFxhbUvnARFckbiJQUdMRfB0oBKClXvk1GE4w0XxYlbbo4ACTR6s1VI6X7heN

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

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    name character varying(255),
    key character varying(255) NOT NULL,
    subject character varying(255),
    content text,
    variables jsonb,
    active integer DEFAULT 1,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_templates_id_seq OWNER TO postgres;

--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


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
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(255),
    description text,
    value integer DEFAULT 0,
    key character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "createdBy" integer
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    "roleId" integer NOT NULL,
    "permissionId" integer,
    value integer DEFAULT 0,
    key character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "createdBy" integer,
    scope integer
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(255),
    description text,
    "parentId" integer,
    key character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "createdBy" integer,
    "updatedBy" integer
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(20) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(50),
    "startDate" date,
    "dayOff" date,
    "profileFamily" jsonb DEFAULT '[]'::jsonb,
    "chevronId" integer,
    "departmentId" integer,
    status character varying(20),
    "roleId" integer,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    gender integer DEFAULT 0,
    birthday date,
    phone character varying(15),
    "identificationPhoto" character varying(512),
    monthly_leave_balance integer DEFAULT 0,
    "fullName" character varying(100)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.migrations_lock_index_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (id, name, key, subject, content, variables, active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, name, batch, migration_time) FROM stdin;
1	20220609000001_create_roles_table.js	1	2025-09-06 02:27:27.33+07
2	20220609000004_create_users_table.js	1	2025-09-06 02:27:27.338+07
3	20220609000005_create_permissions_table.js	1	2025-09-06 02:27:27.344+07
4	20220609000006_create_role_permissions_table.js	1	2025-09-06 02:27:27.351+07
5	20230825021657_create_email_templates_table.js	1	2025-09-06 02:27:27.356+07
6	20250122121211_modify_profileFamily_col.js	1	2025-09-06 02:27:27.362+07
7	20250213082147_update_users_info.js	1	2025-09-06 02:27:27.364+07
8	20250214090000_add_identificationPhoto_to_users.js	1	2025-09-06 02:27:27.364+07
10	20250927131329_add_Monthly_Leave_Balance.js	3	2025-09-27 20:29:13.07+07
11	20250916000001_add_salary_allowance_to_users.js	3	2025-09-27 20:29:13.07+07
13	20251103101115_remove_unused_interface.js	4	2025-11-03 17:18:07.11+07
14	20251106000001_replace_firstname_lastname_with_fullname.js	5	2025-11-06 01:59:03.561+07
\.


--
-- Data for Name: migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, description, value, key, "createdAt", "updatedAt", "createdBy") FROM stdin;
1	root	root	31	root	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
2	Quản lý người dùng	Quản lý người dùng	31	users	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
3	Quản lý vai trò	Quản lý vai trò	31	roles	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
4	Phân quyền	Phân quyền	2	decentralization	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
5	Đơn từ	Đơn từ	31	applications	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
6	Cài đặt	Cài đặt	31	settings	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
7	Quản lý hợp đồng	Quản lý hợp đồng	31	contractTypes	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
8	Quản lý chức vụ	Quản lý chức vụ	31	chevrons	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
9	Quản lý phòng ban	Quản lý phòng ban	31	departments	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
10	Dashboard	Dashboard	31	dashboard	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
11	Chấm công	Chấm công	31	timeAttendance	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
12	Quản lý phụ cấp	Quản lý phụ cấp	31	salary_allowances	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
13	Quản lý lương	Quản lý lương	31	salaries	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
14	Thông tin lương cá nhân	Thông tin lương cá nhân	31	personal_salary_info	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
15	Quản lý hò sơ nhân viên	Quản lý hò sơ nhân viên	31	CV	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
16	Quản lý công việc	Quản lý công việc	31	projects	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
17	Quản lý đơn từ	Quản lý đơn từ (CRUD đầy đủ)	31	manage_applications	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
18	Duyệt đơn đăng ký ca	Duyệt đơn đăng ký ca làm việc	31	shiftApproval	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
19	Đăng ký ca	Đăng ký ca làm việc (tạo và xem đơn đăng ký ca)	31	shiftRegistration	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
20	Cấu hình ca	Cấu hình ca làm việc (quản lý lịch, ca, cấu hình chung)	31	shiftConfiguration	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
21	Quản lí KPI nhân viên	Quản lí KPI nhân viên	31	kpiManagement	2025-12-23 22:17:39.133578+07	2025-12-23 22:17:39.133578+07	\N
22	Quản lý ngày lễ	Quản lý ngày nghỉ lễ hệ thống	31	holidays	2026-01-24 21:10:36.134892+07	2026-01-24 21:10:36.134892+07	\N
23	Chấm công hàng ngày	Xem chấm công hàng ngày (Daily Attendance Monitor)	31	dailyAttendance	2026-01-27 23:26:11.356009+07	2026-01-27 23:26:11.356009+07	\N
24	Lịch sử chấm công	Xem lịch sử nhật ký chấm công (Attendance Logs)	31	attendance_history	2026-01-28 02:03:15.257386+07	2026-01-28 02:03:15.257386+07	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, "roleId", "permissionId", value, key, "createdAt", "createdBy", scope) FROM stdin;
557	1	4	31	decentralization	2025-12-23 22:17:50.055135+07	\N	1
554	1	1	31	root	2025-12-23 22:17:50.055135+07	\N	1
555	1	2	31	users	2025-12-23 22:17:50.055135+07	\N	1
556	1	3	31	roles	2025-12-23 22:17:50.055135+07	\N	1
558	1	5	31	applications	2025-12-23 22:17:50.055135+07	\N	1
559	1	6	31	settings	2025-12-23 22:17:50.055135+07	\N	1
560	1	7	31	contractTypes	2025-12-23 22:17:50.055135+07	\N	1
561	1	8	31	chevrons	2025-12-23 22:17:50.055135+07	\N	1
562	1	9	31	departments	2025-12-23 22:17:50.055135+07	\N	1
563	1	10	31	dashboard	2025-12-23 22:17:50.055135+07	\N	1
564	1	11	31	timeAttendance	2025-12-23 22:17:50.055135+07	\N	1
565	1	12	31	salary_allowances	2025-12-23 22:17:50.055135+07	\N	1
566	1	13	31	salaries	2025-12-23 22:17:50.055135+07	\N	1
567	1	14	31	personal_salary_info	2025-12-23 22:17:50.055135+07	\N	1
568	1	15	31	CV	2025-12-23 22:17:50.055135+07	\N	1
569	1	16	31	projects	2025-12-23 22:17:50.055135+07	\N	1
570	1	17	31	manage_applications	2025-12-23 22:17:50.055135+07	\N	1
571	1	18	31	shiftApproval	2025-12-23 22:17:50.055135+07	\N	1
572	1	21	31	kpiManagement	2025-12-23 22:17:50.055135+07	\N	1
573	2	2	4	users	2025-12-23 22:17:50.055135+07	\N	3
576	2	11	4	timeAttendance	2025-12-23 22:17:50.055135+07	\N	3
577	2	14	4	personal_salary_info	2025-12-23 22:17:50.055135+07	\N	3
579	2	16	4	projects	2025-12-23 22:17:50.055135+07	\N	3
583	3	2	4	users	2025-12-23 22:17:50.055135+07	\N	2
584	3	5	31	applications	2025-12-23 22:17:50.055135+07	\N	2
585	3	10	4	dashboard	2025-12-23 22:17:50.055135+07	\N	2
586	3	11	20	timeAttendance	2025-12-23 22:17:50.055135+07	\N	2
587	3	14	4	personal_salary_info	2025-12-23 22:17:50.055135+07	\N	3
588	3	15	4	CV	2025-12-23 22:17:50.055135+07	\N	2
589	3	16	31	projects	2025-12-23 22:17:50.055135+07	\N	2
590	3	17	31	manage_applications	2025-12-23 22:17:50.055135+07	\N	2
595	4	10	4	dashboard	2025-12-23 22:17:50.055135+07	\N	1
597	4	12	31	salary_allowances	2025-12-23 22:17:50.055135+07	\N	1
598	4	13	31	salaries	2025-12-23 22:17:50.055135+07	\N	1
604	5	2	31	users	2025-12-23 22:17:50.055135+07	\N	1
605	5	3	4	roles	2025-12-23 22:17:50.055135+07	\N	1
606	5	4	6	decentralization	2025-12-23 22:17:50.055135+07	\N	1
607	5	5	31	applications	2025-12-23 22:17:50.055135+07	\N	1
609	5	7	31	contractTypes	2025-12-23 22:17:50.055135+07	\N	1
610	5	8	31	chevrons	2025-12-23 22:17:50.055135+07	\N	1
611	5	9	31	departments	2025-12-23 22:17:50.055135+07	\N	1
612	5	10	4	dashboard	2025-12-23 22:17:50.055135+07	\N	1
613	5	11	31	timeAttendance	2025-12-23 22:17:50.055135+07	\N	1
616	5	14	4	personal_salary_info	2025-12-23 22:17:50.055135+07	\N	3
617	5	15	31	CV	2025-12-23 22:17:50.055135+07	\N	1
619	5	17	31	manage_applications	2025-12-23 22:17:50.055135+07	\N	1
620	5	18	31	shiftApproval	2025-12-23 22:17:50.055135+07	\N	1
621	1	19	31	shiftRegistration	2025-12-23 22:17:50.055135+07	\N	1
622	1	20	31	shiftConfiguration	2025-12-23 22:17:50.055135+07	\N	1
624	3	19	31	shiftRegistration	2025-12-23 22:17:50.055135+07	\N	2
626	5	19	31	shiftRegistration	2025-12-23 22:17:50.055135+07	\N	1
627	5	20	31	shiftConfiguration	2025-12-23 22:17:50.055135+07	\N	1
639	3	24	4	attendance_history	2026-01-28 02:03:15.28015+07	\N	2
596	4	11	4	timeAttendance	2025-12-23 22:17:50.055135+07	\N	1
599	4	14	31	personal_salary_info	2025-12-23 22:17:50.055135+07	\N	3
593	4	2	4	users	2025-12-23 22:17:50.055135+07	\N	3
594	4	5	31	applications	2025-12-23 22:17:50.055135+07	\N	3
608	5	6	31	settings	2025-12-23 22:17:50.055135+07	\N	1
591	3	18	31	shiftApproval	2025-12-23 22:17:50.055135+07	\N	2
592	3	21	31	kpiManagement	2025-12-23 22:17:50.055135+07	\N	2
574	2	5	15	applications	2025-12-23 22:17:50.055135+07	\N	3
580	2	17	15	manage_applications	2025-12-23 22:17:50.055135+07	\N	3
623	2	19	15	shiftRegistration	2025-12-23 22:17:50.055135+07	\N	3
632	1	22	31	holidays	2026-01-24 21:10:49.488543+07	\N	1
633	5	22	31	holidays	2026-01-24 21:10:49.980798+07	\N	1
640	2	24	4	attendance_history	2026-01-28 02:03:15.283368+07	\N	3
575	2	10	12	dashboard	2025-12-23 22:17:50.055135+07	\N	3
634	1	23	31	dailyAttendance	2026-01-27 23:26:11.375261+07	\N	1
635	5	23	31	dailyAttendance	2026-01-27 23:26:11.384828+07	\N	1
636	3	23	4	dailyAttendance	2026-01-27 23:26:11.387513+07	\N	2
637	1	24	31	attendance_history	2026-01-28 02:03:15.267324+07	\N	1
638	5	24	31	attendance_history	2026-01-28 02:03:15.276819+07	\N	1
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, "parentId", key, "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
1	Admin	Quản trị viên hệ thống	\N	root	2025-11-16 10:24:56.313579+07	2025-11-16 10:24:56.313579+07	\N	\N
2	Nhân viên	Nhân viên thực thi	\N	employee	2025-11-16 10:24:56.313579+07	2025-11-16 10:24:56.313579+07	\N	\N
3	Quản lý	Cấp quản lý (Team Leader, Manager, Director)	2	leader	2025-11-16 10:24:56.313579+07	2025-11-16 10:24:56.313579+07	\N	\N
4	Kế toán	Nhân viên kế toán/tài chính	2	accountant	2025-11-16 10:24:56.313579+07	2025-11-16 10:24:56.313579+07	\N	\N
5	Nhân sự	Nhân viên nhân sự	2	hr	2025-11-16 10:24:56.313579+07	2025-11-16 10:24:56.313579+07	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, email, "startDate", "dayOff", "profileFamily", "chevronId", "departmentId", status, "roleId", "createdBy", "updatedBy", "createdAt", "updatedAt", gender, birthday, phone, "identificationPhoto", monthly_leave_balance, "fullName") FROM stdin;
104	phuonghl	$2a$10$YAimyl.wAqBvdi0Qq6Yea.sa6tvFurHJDtg2spTIWVBHfe9YXWqYi	hoanglanphuong@gmail.com	2025-11-01	\N	[{"name": "Hoàng Mạnh Thắng", "birthday": "1974-04-17T00:00:00.000Z", "dependent": false, "relationship": 1}, {"name": "Lê Thị Ngọc Mai", "birthday": "1976-09-20T00:00:00.000Z", "dependent": false, "relationship": 2}]	8	5	1	4	2	2	2025-11-16 22:59:28.257193+07	2025-12-20 17:37:47.928+07	2	2008-10-03	0911289035	phuonghl.png	0	Hoàng Lan Phương
16	tech_senior013	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior013@company.com	2021-10-01	\N	[{"name": "Người thân 1", "birthday": "1986-11-19T00:00:00.000Z", "relationship": 5}]	6	2	1	2	\N	2	2025-11-16 10:24:56.629+07	2025-12-20 17:48:24.098+07	2	1989-11-20	0960000016	tech_senior013.png	0	Võ Thị Hoa
105	test_1764010213016	$2a$10$VXoSh9bEckyuwbAlV80.h.Sg8rYnN/d/TjDFFxhnSka5itGqi4sFG	test1764010213016@example.com	2025-11-24	\N	[]	1	1	3	1	2	\N	2025-11-25 01:50:13.180478+07	2025-11-25 01:50:13.180478+07	1	1995-05-15	0987654321	test_1764010213016.png	0	Nguyễn Văn Test API
61	sales_exec058	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec058@company.com	2021-07-01	\N	[{"name": "Người thân 1", "birthday": "2013-02-07T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1964-05-16T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "1941-07-10T00:00:00.000Z", "relationship": 2}]	7	3	1	2	\N	2	2025-11-16 10:24:56.63+07	2025-12-20 17:44:37.451+07	1	1998-09-19	0910000061	sales_exec058.png	0	Phạm Văn Long
8	tech_lead005	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_lead005@company.com	2019-04-01	\N	[{"name": "Người thân 1", "birthday": "1982-10-26T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1971-12-05T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 3", "birthday": "1946-05-21T00:00:00.000Z", "relationship": 7}]	3	2	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1989-11-27	0980000008	tech_lead005.png	0	Phan Thị Thảo
9	tech_deputy006	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_deputy006@company.com	2019-09-01	\N	[{"name": "Người thân 1", "birthday": "2017-07-06T00:00:00.000Z", "relationship": 8}]	4	2	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1987-09-25	0990000009	tech_deputy006.png	0	Lê Đức Hải
10	tech_tl007	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_tl007@company.com	2019-12-01	\N	[{"name": "Người thân 1", "birthday": "1988-08-22T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1955-02-18T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 3", "birthday": "1947-06-01T00:00:00.000Z", "relationship": 2}]	5	2	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1986-12-06	0900000010	tech_tl007.png	0	Bùi Thị Mai
11	tech_tl008	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_tl008@company.com	2019-08-01	\N	[{"name": "Người thân 1", "birthday": "1978-05-08T00:00:00.000Z", "relationship": 3}]	5	2	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1993-11-05	0910000011	tech_tl008.png	0	Phạm Văn Long
12	tech_tl009	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_tl009@company.com	2019-01-01	\N	[{"name": "Người thân 1", "birthday": "1948-10-20T00:00:00.000Z", "relationship": 6}]	5	2	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1989-02-15	0920000012	tech_tl009.png	0	Hồ Thị Nga
13	tech_senior010	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior010@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1993-03-16T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1941-01-27T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "1995-02-07T00:00:00.000Z", "relationship": 5}]	6	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1988-06-20	0930000013	tech_senior010.png	0	Hoàng Văn Nam
14	tech_senior011	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior011@company.com	2021-04-01	\N	[{"name": "Người thân 1", "birthday": "1944-03-08T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 2", "birthday": "1973-08-14T00:00:00.000Z", "relationship": 1}]	6	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1998-09-27	0940000014	tech_senior011.png	0	Dương Thị Linh
15	tech_senior012	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior012@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "1970-08-25T00:00:00.000Z", "relationship": 5}]	6	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1993-10-08	0950000015	tech_senior012.png	0	Vũ Minh Quân
17	tech_senior014	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior014@company.com	2021-07-01	\N	[{"name": "Người thân 1", "birthday": "1988-06-22T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1944-10-11T00:00:00.000Z", "relationship": 1}]	6	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1985-08-20	0970000017	tech_senior014.png	0	Phan Văn Khoa
43	sales_senior040	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior040@company.com	2021-04-01	\N	[{"name": "Người thân 1", "birthday": "1992-03-04T00:00:00.000Z", "relationship": 3}]	6	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1993-06-14	0930000043	sales_senior040.png	0	Hoàng Văn An
123	test 12345	$2a$10$2uI3I9gF6p/o7O80qjzI3Oqk52fwQ7iUxAZGtUuFugkGnifOAoOZm	hoangmanhtoan01113@gmail.com	2026-01-18	\N	[{"name": "Người thân 1", "birthday": "1992-01-01T00:00:00.000Z", "dependent": false, "relationship": 4}, {"name": "Nhung", "birthday": "1954-01-07T00:00:00.000Z", "dependent": false, "relationship": 6}]	8	3	1	3	\N	\N	2026-01-18 02:04:45.779818+07	2026-01-19 23:21:11.858+07	1	2026-01-18	0823900771	test 12345.png	0	AAA777777
110	Abc123	$2a$10$utGh50rpKiaqoBhPIRV9S.p4gc0cdItnG6VP0NMdZPCAcczXVQe.e	abc@gmail.com	2025-11-25	\N	[]	8	2	3	2	2	2	2025-11-25 16:39:03.588471+07	2025-11-25 20:45:40.751+07	1	2025-11-25	0987654321	Abc123.png	0	A b c 123 123 123
124	abc777777	$2a$10$TdtP06bXwk.b2VFymtqosOSET6GO35akYUFdtm4fUyFWmkdGhXG.e	abc777777@gmail.com	2026-01-19	\N	[{"name": "Người thân 1", "birthday": "1955-01-01T00:00:00.000Z", "dependent": false, "relationship": 1}, {"name": "Người thân 2", "birthday": "1956-01-14T00:00:00.000Z", "dependent": false, "relationship": 2}]	8	2	1	2	\N	\N	2026-01-19 23:58:57.049772+07	2026-01-19 23:58:57.049772+07	2	2026-01-19	0823900771	abc777777.png	0	A B C
125	abc123123	$2a$10$tLkFTu9fmOj86OqzjAWnYuuVs0m9rtIp54zUC62ayc.5yawJPU3OC	abc123123@gmail.com	2026-01-20	\N	[{"name": "Người thân 1", "birthday": "1076-12-30T00:00:00.000Z", "dependent": false, "relationship": 1}, {"name": "Người thân 2", "dependent": false, "relationship": 2}]	9	2	1	2	\N	\N	2026-01-20 14:45:40.484236+07	2026-01-20 14:45:40.484236+07	2	2000-01-20	0823900712	abc123123.png	0	A B C 123123
19	tech_senior016	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior016@company.com	2021-08-01	\N	[{"name": "Người thân 1", "birthday": "1987-02-07T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1947-05-17T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "1974-10-05T00:00:00.000Z", "relationship": 5}]	6	2	1	2	\N	2	2025-11-16 10:24:56.629+07	2025-12-20 17:44:58.4+07	1	1993-02-14	0990000019	tech_senior016.png	0	Đặng Văn Dũng
20	tech_senior017	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior017@company.com	2021-12-01	\N	[{"name": "Người thân 1", "birthday": "1960-07-26T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "2014-12-25T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 3", "birthday": "1978-04-11T00:00:00.000Z", "relationship": 5}]	6	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1992-01-10	0900000020	tech_senior017.png	0	Phạm Thị Phúc
21	tech_mid018	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid018@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "2004-08-05T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1946-03-08T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "1985-04-24T00:00:00.000Z", "relationship": 4}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1996-01-12	0910000021	tech_mid018.png	0	Bùi Văn Hùng
22	tech_mid019	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid019@company.com	2021-01-01	\N	[{"name": "Người thân 1", "birthday": "1961-03-07T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1954-08-28T00:00:00.000Z", "relationship": 7}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1987-05-08	0920000022	tech_mid019.png	0	Vũ Thị Tâm
23	tech_mid020	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid020@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1986-02-07T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1977-03-01T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 3", "birthday": "1982-05-09T00:00:00.000Z", "relationship": 4}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1997-12-14	0930000023	tech_mid020.png	0	Đỗ Văn Phong
24	tech_mid021	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid021@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1965-05-20T00:00:00.000Z", "relationship": 1}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1991-11-14	0940000024	tech_mid021.png	0	Bùi Thị Thủy
25	tech_mid022	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid022@company.com	2021-07-01	\N	[{"name": "Người thân 1", "birthday": "1981-11-27T00:00:00.000Z", "relationship": 3}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1993-12-27	0950000025	tech_mid022.png	0	Hồ Văn Sang
26	tech_mid023	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid023@company.com	2021-03-01	\N	[{"name": "Người thân 1", "birthday": "1974-08-25T00:00:00.000Z", "relationship": 2}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1987-12-05	0960000026	tech_mid023.png	0	Ngô Thị Tú
27	tech_mid024	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid024@company.com	2021-10-01	\N	[{"name": "Người thân 1", "birthday": "2013-05-11T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1967-07-10T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "1972-05-10T00:00:00.000Z", "relationship": 1}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1991-04-21	0970000027	tech_mid024.png	0	Ngô Văn Sơn
28	tech_mid025	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid025@company.com	2021-04-01	\N	[{"name": "Người thân 1", "birthday": "1970-09-03T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "1994-12-17T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 3", "birthday": "1988-11-17T00:00:00.000Z", "relationship": 3}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1995-02-26	0980000028	tech_mid025.png	0	Lý Thị Uyên
29	tech_mid026	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid026@company.com	2021-08-01	\N	[{"name": "Người thân 1", "birthday": "1971-01-02T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "2014-07-11T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 3", "birthday": "1942-12-05T00:00:00.000Z", "relationship": 7}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1996-11-18	0990000029	tech_mid026.png	0	Dương Văn Thanh
71	mkt_tl068	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_tl068@company.com	2019-07-01	\N	[{"name": "Người thân 1", "birthday": "1986-05-19T00:00:00.000Z", "relationship": 3}]	5	4	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1998-11-26	0910000071	mkt_tl068.png	0	Bùi Văn Hùng
31	tech_mid028	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid028@company.com	2021-10-01	\N	[{"name": "Người thân 1", "birthday": "1953-03-24T00:00:00.000Z", "relationship": 6}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1989-02-05	0910000031	tech_mid028.png	0	Lý Văn Tiến
106	test_1764042470680	$2a$10$4QHg..ghQvUf5M7hOuV8ZuxbZO8dYi0inGcOAXWZRB38xTQtpU/0a	test1764042470680@example.com	2025-11-25	\N	[]	1	1	3	1	2	\N	2025-11-25 10:47:50.794519+07	2025-11-25 10:47:50.794519+07	1	1995-05-15	0987654321	test_1764042470680.png	0	Nguyễn Văn Test API
32	tech_junior029	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_junior029@company.com	2021-06-01	\N	[{"name": "Người thân 1", "birthday": "1972-09-27T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "2011-03-16T00:00:00.000Z", "relationship": 8}]	8	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1986-11-07	0920000032	tech_junior029.png	0	Lê Thị Vũ
33	tech_junior030	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_junior030@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "1970-07-12T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1967-08-09T00:00:00.000Z", "relationship": 1}]	8	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1989-10-24	0930000033	tech_junior030.png	0	Võ Văn Trung
34	tech_junior031	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_junior031@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1945-10-02T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1962-03-17T00:00:00.000Z", "relationship": 6}]	8	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1990-02-10	0940000034	tech_junior031.png	0	Hoàng Thị Ý
35	tech_junior032	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_junior032@company.com	2021-08-01	\N	[{"name": "Người thân 1", "birthday": "1990-01-03T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1977-07-07T00:00:00.000Z", "relationship": 4}]	8	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1988-05-01	0950000035	tech_junior032.png	0	Nguyễn Văn Tuấn
36	tech_junior033	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_junior033@company.com	2021-02-01	\N	[{"name": "Người thân 1", "birthday": "1973-06-15T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "2002-09-09T00:00:00.000Z", "relationship": 8}]	8	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1986-12-08	0960000036	tech_junior033.png	0	Vũ Thị Bình
38	sales_lead035	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_lead035@company.com	2019-05-01	\N	[{"name": "Người thân 1", "birthday": "1941-07-25T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 2", "birthday": "1972-10-15T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 3", "birthday": "1955-02-11T00:00:00.000Z", "relationship": 2}]	3	3	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1993-03-02	0980000038	sales_lead035.png	0	Bùi Thị Giang
39	sales_deputy036	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_deputy036@company.com	2019-05-01	\N	[{"name": "Người thân 1", "birthday": "1980-09-24T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 2", "birthday": "1983-02-07T00:00:00.000Z", "relationship": 5}]	4	3	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1985-05-17	0990000039	sales_deputy036.png	0	Lê Văn Vinh
40	sales_tl037	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_tl037@company.com	2019-12-01	\N	[{"name": "Người thân 1", "birthday": "1941-06-04T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 2", "birthday": "1994-08-01T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 3", "birthday": "1977-02-01T00:00:00.000Z", "relationship": 3}]	5	3	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1992-06-10	0900000040	sales_tl037.png	0	Hồ Thị Khánh
41	sales_tl038	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_tl038@company.com	2019-01-01	\N	[{"name": "Người thân 1", "birthday": "1946-11-10T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "2013-11-11T00:00:00.000Z", "relationship": 8}]	5	3	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1996-01-23	0910000041	sales_tl038.png	0	Phạm Văn Yến
42	sales_tl039	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_tl039@company.com	2019-04-01	\N	[{"name": "Người thân 1", "birthday": "1956-03-24T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1946-08-24T00:00:00.000Z", "relationship": 1}]	5	3	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1996-02-03	0920000042	sales_tl039.png	0	Dương Thị Ngọc
44	sales_senior041	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior041@company.com	2021-03-30	\N	[{"name": "Người thân 1", "birthday": "1995-06-08T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1965-06-13T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 3", "birthday": "2018-12-04T00:00:00.000Z", "relationship": 8}]	6	3	1	2	\N	2	2025-11-16 10:24:56.63+07	2025-11-25 10:59:30.288+07	2	1989-05-01	0940000044	sales_senior041.png	0	Võ Thị Quyên
30	tech_mid027	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_mid027@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "1968-12-16T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1979-11-06T00:00:00.000Z", "relationship": 3}]	7	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1995-09-17	0900000030	tech_mid027.png	0	Nguyễn Thị Xuân
111	testdel936747	$2a$10$U/bPhJ8q1lb6GRucU4FU3ek6FdbRJb6qgPNNvU7tZNJhyLqZXUn2.	testdelete1764066936747@example.com	2025-11-25	\N	[]	1	1	3	1	2	\N	2025-11-25 17:35:36.99913+07	2025-11-25 17:35:36.99913+07	1	1995-05-15	0999999999	testdel936747.png	0	Test Delete User
7	director_mem004	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	director_mem004@company.com	2019-04-01	\N	[{"name": "Người thân 1", "birthday": "1985-12-01T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1989-01-18T00:00:00.000Z", "relationship": 4}]	3	1	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1997-07-20	0970000007	director_mem004.png	0	Trần Văn Tuấn
4	director001	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	director001@company.com	2019-01-01	\N	[{"name": "Người thân 1", "birthday": "1964-07-14T00:00:00.000Z", "relationship": 2}]	1	1	1	3	\N	\N	2025-11-16 10:24:56.628+07	2025-11-16 10:24:56.628+07	2	1995-06-19	0940000004	director001.png	0	Trần Thị Hương
45	sales_senior042	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior042@company.com	2020-12-30	\N	[{"name": "Người thân 1", "birthday": "2003-05-18T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1958-11-23T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 3", "birthday": "1961-02-20T00:00:00.000Z", "relationship": 6}]	6	3	1	2	\N	2	2025-11-16 10:24:56.63+07	2025-11-25 11:13:44.064+07	1	1989-12-05	0950000045	sales_senior042.png	0	Phan Văn Chi
46	sales_senior043	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior043@company.com	2021-04-01	\N	[{"name": "Người thân 1", "birthday": "1943-12-28T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "1947-07-03T00:00:00.000Z", "relationship": 6}]	6	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1997-11-18	0960000046	sales_senior043.png	0	Trần Thị Hà
47	sales_senior044	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior044@company.com	2021-04-01	\N	[{"name": "Người thân 1", "birthday": "1992-01-08T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1945-10-07T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 3", "birthday": "1964-12-17T00:00:00.000Z", "relationship": 6}]	6	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1988-02-05	0970000047	sales_senior044.png	0	Vũ Văn Hiếu
107	test_1764044308056	$2a$10$5miDqlOFGt4u1cb7oTA.8.V5nADgQi2JSH.yx90yltC5MfQD2hVT2	test1764044308056@example.com	2025-11-25	\N	[]	1	1	3	1	2	\N	2025-11-25 11:18:28.149718+07	2025-11-25 11:18:28.149718+07	1	1995-05-15	0987654321	test_1764044308056.png	0	Nguyễn Văn Test API
121	abc	$2a$10$AZHlMMe/QzXyBfI11tq4q.YvYMRmGHVq/qr5zYxBkccI5p9pjgdFa	abc123@gmail.com	2026-01-07	\N	[{"name": "C C C", "birthday": "1974-01-07T00:00:00.000Z", "dependent": false, "relationship": 1}, {"name": "W E W", "birthday": "1976-01-07T00:00:00.000Z", "dependent": false, "relationship": 2}]	10	4	3	2	\N	\N	2026-01-07 15:54:47.158301+07	2026-01-07 15:55:10.333+07	2	2002-01-07	0823900774	abc.png	0	A B C 123
122	test123	$2a$10$.M5vvopRXumNLoVGm4Fe3.RUjMsCzDVlPcYswCzcBGZFtHbVp8ve2	tech_mgr72@company.com	2026-01-08	\N	[{"name": "Nguyễn Văn R", "birthday": "2026-01-08T00:00:00.000Z", "dependent": false, "relationship": 1}, {"name": "Người thân 2", "birthday": "2026-01-08T00:00:00.000Z", "dependent": false, "relationship": 2}]	9	2	1	2	\N	\N	2026-01-08 00:59:13.453609+07	2026-01-10 18:17:00.303+07	1	1994-01-08	0823900773	test123.png	0	test12345678
48	sales_senior045	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior045@company.com	2021-10-01	\N	[{"name": "Người thân 1", "birthday": "1989-02-23T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 2", "birthday": "1978-03-25T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 3", "birthday": "1966-04-28T00:00:00.000Z", "relationship": 7}]	6	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1998-02-03	0980000048	sales_senior045.png	0	Phạm Thị Hương
49	sales_senior046	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior046@company.com	2021-06-01	\N	[{"name": "Người thân 1", "birthday": "2002-06-26T00:00:00.000Z", "relationship": 8}]	6	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1988-07-15	0990000049	sales_senior046.png	0	Đặng Văn Minh
50	sales_senior047	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_senior047@company.com	2021-10-01	\N	[{"name": "Người thân 1", "birthday": "1982-07-13T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1973-12-10T00:00:00.000Z", "relationship": 6}]	6	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1994-05-22	0900000050	sales_senior047.png	0	Phan Thị Lan
51	sales_exec048	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec048@company.com	2021-01-01	\N	[{"name": "Người thân 1", "birthday": "1968-07-13T00:00:00.000Z", "relationship": 7}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1985-03-08	0910000051	sales_exec048.png	0	Bùi Văn Quân
3	toanhm	$2a$10$HLPUVec1oMTaoOVQ42nlJ.atPqCTVCc8XH61XdA5MJrqo0Ns8YUSq	hoangmanhtoan02092003@gmail.com	2018-06-01	\N	[{"name": "Người thân 1", "birthday": "1966-08-03T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1985-05-17T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 3", "birthday": "1949-10-09T00:00:00.000Z", "relationship": 1}]	3	2	1	3	\N	2	2025-11-16 10:24:56.626+07	2026-01-26 12:26:10.69+07	1	1987-07-25	0930000003	/identificationPhoto/toanhm.jpg	0	Hoàng Mạnh Toàn
2	admin	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	admin@company.com	2015-01-01	\N	[{"name": "Người thân 1", "birthday": "1965-12-18T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 2", "birthday": "1958-10-09T00:00:00.000Z", "relationship": 2}]	1	1	1	1	\N	\N	2025-11-16 10:24:56.615+07	2025-11-16 10:24:56.615+07	1	1990-09-03	0920000002	admin.png	0	Administrator
6	director_mem003	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	director_mem003@company.com	2019-01-01	\N	[{"name": "Người thân 1", "birthday": "1941-12-05T00:00:00.000Z", "relationship": 7}]	3	1	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1985-07-14	0960000006	director_mem003.png	0	Hoàng Thị Lan
54	sales_exec051	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec051@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "1987-01-09T00:00:00.000Z", "relationship": 5}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1985-10-28	0940000054	sales_exec051.png	0	Trần Thị Hương
55	sales_exec052	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec052@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "1987-08-09T00:00:00.000Z", "relationship": 3}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1989-05-15	0950000055	sales_exec052.png	0	Nguyễn Văn Minh
72	mkt_senior069	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_senior069@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1973-08-05T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1942-05-13T00:00:00.000Z", "relationship": 2}]	6	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1995-03-22	0920000072	mkt_senior069.png	0	Vũ Thị Tâm
56	sales_exec053	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec053@company.com	2021-04-01	\N	[{"name": "Người thân 1", "birthday": "1976-09-19T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1972-07-24T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 3", "birthday": "1985-08-14T00:00:00.000Z", "relationship": 4}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1994-07-15	0960000056	sales_exec053.png	0	Hoàng Thị Lan
57	sales_exec054	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec054@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1968-01-18T00:00:00.000Z", "relationship": 1}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1992-11-22	0970000057	sales_exec054.png	0	Trần Văn Tuấn
58	sales_exec055	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec055@company.com	2021-04-01	\N	[{"name": "Người thân 1", "birthday": "1995-05-09T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 2", "birthday": "1982-02-23T00:00:00.000Z", "relationship": 3}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1996-07-11	0980000058	sales_exec055.png	0	Phan Thị Thảo
59	sales_exec056	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec056@company.com	2021-06-01	\N	[{"name": "Người thân 1", "birthday": "1983-04-09T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 2", "birthday": "1958-06-06T00:00:00.000Z", "relationship": 6}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1986-12-13	0990000059	sales_exec056.png	0	Lê Đức Hải
60	sales_exec057	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec057@company.com	2021-07-01	\N	[{"name": "Người thân 1", "birthday": "1968-05-19T00:00:00.000Z", "relationship": 7}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1996-03-05	0900000060	sales_exec057.png	0	Bùi Thị Mai
62	sales_exec059	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec059@company.com	2021-02-01	\N	[{"name": "Người thân 1", "birthday": "2016-06-11T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1970-11-11T00:00:00.000Z", "relationship": 1}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1988-07-12	0920000062	sales_exec059.png	0	Hồ Thị Nga
63	sales_junior060	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_junior060@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1975-04-16T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1990-09-16T00:00:00.000Z", "relationship": 5}, {"name": "Người thân 3", "birthday": "1970-01-18T00:00:00.000Z", "relationship": 3}]	8	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1993-11-18	0930000063	sales_junior060.png	0	Hoàng Văn Nam
64	sales_junior061	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_junior061@company.com	2021-02-01	\N	[{"name": "Người thân 1", "birthday": "1974-11-17T00:00:00.000Z", "relationship": 1}]	8	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1996-05-10	0940000064	sales_junior061.png	0	Dương Thị Linh
66	sales_junior063	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_junior063@company.com	2021-06-01	\N	[{"name": "Người thân 1", "birthday": "2007-09-06T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1972-10-14T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 3", "birthday": "2008-04-04T00:00:00.000Z", "relationship": 8}]	8	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1988-10-03	0960000066	sales_junior063.png	0	Võ Thị Hoa
67	sales_junior064	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_junior064@company.com	2021-01-01	\N	[{"name": "Người thân 1", "birthday": "1965-07-03T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1954-03-19T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 3", "birthday": "1975-07-22T00:00:00.000Z", "relationship": 5}]	8	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1991-12-02	0970000067	sales_junior064.png	0	Phan Văn Khoa
53	sales_exec050	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec050@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "1981-08-16T00:00:00.000Z", "relationship": 4}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1997-03-24	0930000053	sales_exec050.png	0	Đỗ Văn Đức
65	sales_junior062	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_junior062@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "2016-05-26T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1982-01-18T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 3", "birthday": "1975-07-09T00:00:00.000Z", "relationship": 1}]	8	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1998-01-12	0950000065	sales_junior062.png	0	Vũ Minh Quân
69	mkt_deputy066	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_deputy066@company.com	2019-07-01	\N	[{"name": "Người thân 1", "birthday": "1961-01-08T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "1941-11-15T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 3", "birthday": "1983-04-15T00:00:00.000Z", "relationship": 4}]	4	4	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1998-03-04	0990000069	mkt_deputy066.png	0	Đặng Văn Dũng
70	mkt_tl067	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_tl067@company.com	2019-02-01	\N	[{"name": "Người thân 1", "birthday": "1958-04-14T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1989-04-25T00:00:00.000Z", "relationship": 5}]	5	4	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1986-08-24	0900000070	mkt_tl067.png	0	Phạm Thị Phúc
73	mkt_senior070	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_senior070@company.com	2021-02-01	\N	[{"name": "Người thân 1", "birthday": "2000-10-19T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1981-05-11T00:00:00.000Z", "relationship": 5}]	6	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1995-11-18	0930000073	mkt_senior070.png	0	Đỗ Văn Phong
74	mkt_senior071	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_senior071@company.com	2021-06-01	\N	[{"name": "Người thân 1", "birthday": "1970-09-08T00:00:00.000Z", "relationship": 7}]	6	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1990-05-15	0940000074	mkt_senior071.png	0	Bùi Thị Thủy
75	mkt_senior072	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_senior072@company.com	2021-03-01	\N	[{"name": "Người thân 1", "birthday": "1941-06-25T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1969-05-22T00:00:00.000Z", "relationship": 1}]	6	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1998-12-25	0950000075	mkt_senior072.png	0	Hồ Văn Sang
76	mkt_spec073	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_spec073@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "2011-12-18T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1978-03-12T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 3", "birthday": "2010-11-10T00:00:00.000Z", "relationship": 8}]	7	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1997-10-08	0960000076	mkt_spec073.png	0	Ngô Thị Tú
77	mkt_spec074	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_spec074@company.com	2021-08-01	\N	[{"name": "Người thân 1", "birthday": "1965-12-26T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1948-04-27T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 3", "birthday": "1975-10-02T00:00:00.000Z", "relationship": 4}]	7	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1991-06-17	0970000077	mkt_spec074.png	0	Ngô Văn Sơn
78	mkt_spec075	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_spec075@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "1991-06-28T00:00:00.000Z", "relationship": 5}]	7	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1996-04-27	0980000078	mkt_spec075.png	0	Lý Thị Uyên
79	mkt_spec076	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_spec076@company.com	2021-08-01	\N	[{"name": "Người thân 1", "birthday": "1972-03-24T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1949-06-11T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 3", "birthday": "2009-05-19T00:00:00.000Z", "relationship": 8}]	7	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1996-09-27	0990000079	mkt_spec076.png	0	Dương Văn Thanh
80	mkt_spec077	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_spec077@company.com	2021-03-01	\N	[{"name": "Người thân 1", "birthday": "1974-07-19T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1949-11-02T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "2006-04-03T00:00:00.000Z", "relationship": 8}]	7	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1998-02-20	0900000080	mkt_spec077.png	0	Nguyễn Thị Xuân
81	mkt_spec078	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_spec078@company.com	2021-07-01	\N	[{"name": "Người thân 1", "birthday": "1971-02-12T00:00:00.000Z", "relationship": 3}]	7	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1987-11-05	0910000081	mkt_spec078.png	0	Lý Văn Tiến
82	mkt_spec079	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_spec079@company.com	2021-03-01	\N	[{"name": "Người thân 1", "birthday": "1954-03-14T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1952-02-06T00:00:00.000Z", "relationship": 2}]	7	4	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1989-02-08	0920000082	mkt_spec079.png	0	Lê Thị Vũ
83	hr_lead080	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_lead080@company.com	2019-09-01	\N	[{"name": "Người thân 1", "birthday": "1979-06-23T00:00:00.000Z", "relationship": 3}]	3	6	1	5	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	1	1993-07-07	0930000083	hr_lead080.png	0	Võ Văn Trung
84	hr_deputy081	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_deputy081@company.com	2019-04-01	\N	[{"name": "Người thân 1", "birthday": "2008-12-26T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "2007-04-14T00:00:00.000Z", "relationship": 8}]	4	6	1	5	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1998-06-22	0940000084	hr_deputy081.png	0	Hoàng Thị Ý
68	mkt_lead065	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	mkt_lead065@company.com	2019-11-01	\N	[{"name": "Người thân 1", "birthday": "1970-09-05T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1986-02-19T00:00:00.000Z", "relationship": 3}]	3	4	1	3	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1995-04-09	0980000068	mkt_lead065.png	0	Trần Thị Nhung
87	hr_senior084	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_senior084@company.com	2021-02-01	\N	[{"name": "Người thân 1", "birthday": "1951-06-15T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "1971-10-14T00:00:00.000Z", "relationship": 7}]	6	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1989-07-18	0970000087	hr_senior084.png	0	Trần Văn Tùng
89	hr_senior086	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_senior086@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1985-11-11T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1951-01-02T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 3", "birthday": "1974-03-17T00:00:00.000Z", "relationship": 6}]	6	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1986-05-25	0990000089	hr_senior086.png	0	Lê Văn Vinh
90	hr_spec087	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_spec087@company.com	2021-12-01	\N	[{"name": "Người thân 1", "birthday": "1975-07-18T00:00:00.000Z", "relationship": 1}]	7	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1997-05-01	0900000090	hr_spec087.png	0	Hồ Thị Khánh
91	hr_spec088	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_spec088@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "1987-09-09T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 2", "birthday": "1986-05-24T00:00:00.000Z", "relationship": 4}]	7	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1991-11-24	0910000091	hr_spec088.png	0	Phạm Văn Yến
92	hr_spec089	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_spec089@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "1972-04-21T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1979-05-05T00:00:00.000Z", "relationship": 5}]	7	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1994-09-20	0920000092	hr_spec089.png	0	Dương Thị Ngọc
93	hr_spec090	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_spec090@company.com	2021-11-01	\N	[{"name": "Người thân 1", "birthday": "1953-08-22T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1988-11-05T00:00:00.000Z", "relationship": 3}]	7	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1985-06-28	0930000093	hr_spec090.png	0	Hoàng Văn An
94	hr_junior091	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_junior091@company.com	2021-10-01	\N	[{"name": "Người thân 1", "birthday": "1946-04-03T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1953-09-27T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 3", "birthday": "2011-12-04T00:00:00.000Z", "relationship": 8}]	8	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1985-03-27	0940000094	hr_junior091.png	0	Võ Thị Quyên
95	hr_junior092	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_junior092@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "1944-10-28T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1970-02-19T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 3", "birthday": "1947-07-16T00:00:00.000Z", "relationship": 1}]	8	6	1	2	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1995-11-09	0950000095	hr_junior092.png	0	Phan Văn Chi
96	fin_lead093	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_lead093@company.com	2019-05-01	\N	[{"name": "Người thân 1", "birthday": "2009-07-18T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1981-01-24T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 3", "birthday": "1961-05-26T00:00:00.000Z", "relationship": 7}]	3	5	1	4	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1998-07-23	0960000096	fin_lead093.png	0	Trần Thị Hà
98	fin_tl095	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_tl095@company.com	2019-09-01	\N	[{"name": "Người thân 1", "birthday": "1991-08-01T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1969-02-16T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "1979-06-27T00:00:00.000Z", "relationship": 4}]	5	5	1	4	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1987-05-23	0980000098	fin_tl095.png	0	Phạm Thị Hương
99	fin_senior096	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_senior096@company.com	2021-02-01	\N	[{"name": "Người thân 1", "birthday": "1946-10-07T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1946-09-06T00:00:00.000Z", "relationship": 2}]	6	5	1	4	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1985-10-23	0990000099	fin_senior096.png	0	Đặng Văn Minh
101	fin_acc098	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_acc098@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "1953-04-12T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 2", "birthday": "1965-08-02T00:00:00.000Z", "relationship": 7}]	7	5	1	4	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1985-03-11	0910000101	fin_acc098.png	0	Bùi Văn Quân
100	fin_senior097	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_senior097@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "2001-08-06T00:00:00.000Z", "relationship": 8}]	6	5	1	4	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1995-05-22	0900000100	fin_senior097.png	0	Phan Thị Lan
97	fin_deputy094	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_deputy094@company.com	2019-03-01	\N	[{"name": "Người thân 1", "birthday": "2008-01-15T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1961-10-11T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 3", "birthday": "1944-11-19T00:00:00.000Z", "relationship": 1}]	4	5	1	4	\N	2	2025-11-16 10:24:56.631+07	2025-12-20 17:44:21.274+07	1	1992-04-11	0970000097	fin_deputy094.png	0	Vũ Văn Hiếu
18	tech_senior015	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	tech_senior015@company.com	2021-09-01	\N	[{"name": "Người thân 1", "birthday": "1971-03-10T00:00:00.000Z", "relationship": 6}, {"name": "Người thân 2", "birthday": "1976-08-20T00:00:00.000Z", "relationship": 5}]	6	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	2	1988-07-23	0980000018	tech_senior015.png	0	Trần Thị Nhung
108	Abc	$2a$10$kBcC59/hFCzMUd3Ju8OiqOKoNAHRzKy1nYX0kDjh6MCTrXJNdShHy	Abc@gmail.com	2025-11-25	\N	[]	8	2	3	2	2	\N	2025-11-25 16:16:48.164048+07	2025-11-25 16:16:48.164048+07	1	2025-07-15	0987654321	Abc.png	0	A b c
88	hr_senior085	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_senior085@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "1944-03-11T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 2", "birthday": "1977-05-23T00:00:00.000Z", "relationship": 3}]	6	6	1	2	\N	2	2025-11-16 10:24:56.631+07	2025-12-20 17:49:06.643+07	2	1985-06-21	0980000088	hr_senior085.png	0	Bùi Thị Giang
112	nicol	$2a$10$HN8kOgTA2bXWHF7NfU3kt.uZQBpRa3T9LlZq7ZWy1EF3SXGNHKLyq	lebc@gmail.com	2025-12-04	\N	[{"name": "NguyênC", "birthday": "1968-09-12T00:00:00.000Z", "dependent": false, "relationship": 2}]	8	6	1	2	2	2	2025-12-04 15:13:50.856315+07	2025-12-04 15:15:04.698+07	2	1997-12-04	0823900881	nicol.png	0	Lê Thị B
113	Abc1234	$2a$10$6i8glHoUKfJ68acWpTjTE.m9UMrF6W2a6WQ6PptPIqJi9RpClgDrO	Abc1234@gmail.com	2025-12-10	\N	[]	8	2	1	2	2	\N	2025-12-10 17:32:25.639275+07	2025-12-10 17:32:25.639275+07	1	2025-12-10	0987654321	Abc1234.png	0	Abc
126	ngannn	$2a$10$edbOavrBoQvGYLj5bAwG0uODRlJ6Q7Prf9bZ944hVYNckae.hpd1a	ngan12345678@gmail.com	2026-01-23	\N	[{"name": "Người thân 1", "birthday": "1976-01-23T00:00:00.000Z", "dependent": false, "relationship": 1}, {"name": "Người thân 2", "birthday": "1978-01-21T00:00:00.000Z", "dependent": false, "relationship": 2}]	9	2	1	2	\N	\N	2026-01-23 00:26:54.094264+07	2026-01-23 00:27:17.083+07	2	2000-01-23	0823900123	ngannn.png	0	Nguyễn Ngọc Ngân
128	qweq	$2a$10$Sp19VLtPlEGlwHZGAjeyIeBuOQa3XSw.Le6ivgIk1mtqQazckQ4Ia	wqeqw@gmail.com	2026-01-25	\N	[]	10	6	1	5	\N	\N	2026-01-25 13:56:45.028715+07	2026-01-25 20:03:41.697+07	1	2000-01-25	0823900776	qweq.png	0	sđáqweqwe
5	director_dep002	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	director_dep002@company.com	2019-01-01	\N	[{"name": "Người thân 1", "birthday": "1963-12-22T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "2016-09-24T00:00:00.000Z", "relationship": 8}]	2	1	1	3	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1986-10-09	0950000005	director_dep002.png	0	Nguyễn Văn Minh
37	tech_junior034	$2a$10$6GQo.Yw9oxWihq6K5.6n2eUI18iJs.SkIk95vfAqw4zdxcHoe7ccK	tech_junior034@company.com	2021-03-01	\N	[{"name": "Người thân 1", "birthday": "1962-12-27T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "1975-07-18T00:00:00.000Z", "relationship": 2}, {"name": "Người thân 3", "birthday": "1940-10-19T00:00:00.000Z", "relationship": 2}]	8	2	1	2	\N	\N	2025-11-16 10:24:56.629+07	2025-11-16 10:24:56.629+07	1	1996-07-24	0970000037	tech_junior034.png	0	Trần Văn Tùng
52	sales_exec049	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	sales_exec049@company.com	2021-08-01	\N	[{"name": "Người thân 1", "birthday": "2002-09-24T00:00:00.000Z", "relationship": 8}]	7	3	1	2	\N	\N	2025-11-16 10:24:56.63+07	2025-11-16 10:24:56.63+07	2	1990-04-27	0920000052	sales_exec049.png	0	Đặng Thị Mai
102	fin_acc099	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_acc099@company.com	2021-06-01	\N	[{"name": "Người thân 1", "birthday": "1970-09-27T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 2", "birthday": "1972-01-23T00:00:00.000Z", "relationship": 7}]	7	5	1	4	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1990-02-26	0920000102	fin_acc099.png	0	Đặng Thị Mai
103	fin_acc100	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	fin_acc100@company.com	2021-05-01	\N	[{"name": "Người thân 1", "birthday": "1989-01-16T00:00:00.000Z", "relationship": 4}, {"name": "Người thân 2", "birthday": "1974-12-15T00:00:00.000Z", "relationship": 3}, {"name": "Người thân 3", "birthday": "1956-12-06T00:00:00.000Z", "relationship": 6}]	7	5	1	4	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1995-02-27	0930000103	fin_acc100.png	0	Đỗ Văn Đức
109	test_1764063027830	$2a$10$5mOFiMZ2TPcWwZVfJb1jjOq0Q37WIhxW/MIwsQNuxJoa0OpQ7NbZ6	test1764063027830@example.com	2025-11-25	\N	[]	1	1	3	1	2	\N	2025-11-25 16:30:27.919492+07	2025-11-25 16:30:27.919492+07	1	1995-05-15	0987654321	test_1764063027830.png	0	Nguyễn Văn Test API
127	test123456	$2a$10$VGBf7s1wM7K.ToMcE0zIP.Adgs3GUYrFeEpMC1Ocddyd7iaz9N.d6	hoangmanhtoan020912312003@gmail.com	2026-01-24	\N	[]	4	3	1	2	\N	\N	2026-01-24 20:26:03.779572+07	2026-01-25 02:37:14.979+07	1	2026-01-24	0823900776	test123456.png	0	test
85	hr_tl082	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_tl082@company.com	2019-12-01	\N	[{"name": "Người thân 1", "birthday": "2010-07-20T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 2", "birthday": "1969-07-19T00:00:00.000Z", "relationship": 7}, {"name": "Người thân 3", "birthday": "1964-06-12T00:00:00.000Z", "relationship": 1}]	5	6	1	5	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	1	1985-04-19	0950000085	hr_tl082.png	0	Nguyễn Văn Tuấn
129	nguyenvana	$2a$10$/2PdHTwT2TJVhz9kJzTu/.L149LlQDfBh0GqVt0SRoKoY2TXqTsQO	nguyenvana@company.com	2022-01-06	\N	[]	8	2	1	2	\N	\N	2026-01-25 16:32:29.320482+07	2026-01-25 16:32:29.320482+07	1	1995-01-01	988777666	nguyenvana.png	0	Nguyễn Văn A
130	tranthib	$2a$10$TOYLZBhjwnRoPb.zIkrGvuJ.5U.3rLIm1.NUwidfPW04ijIlE32k.	tranthib@company.com	2023-10-01	\N	[]	7	3	1	2	\N	\N	2026-01-25 16:32:29.39453+07	2026-01-25 16:32:29.39453+07	2	1998-05-14	912345678	tranthib.png	0	Trần Thị B
131	levanc	$2a$10$9YFXkbau6y0mzNnu.8nKNeeNpbAgDIonC6Ny0/w5jqiV5OFPtA/m2	levanc@company.com	2020-03-14	\N	[]	5	4	1	3	\N	\N	2026-01-25 16:32:29.464533+07	2026-01-25 16:32:29.464533+07	1	1990-11-19	909090909	levanc.png	0	Lê Văn C
86	mailtn	$2a$10$FKKbknImRU2HFZGfJWa1Keid5CoBuzTESZGxFRno.junNA4AH89c6	hr_tl083@company.com	2019-04-01	\N	[{"name": "Người thân 1", "birthday": "1969-01-17T00:00:00.000Z", "relationship": 1}, {"name": "Người thân 2", "birthday": "2015-03-02T00:00:00.000Z", "relationship": 8}, {"name": "Người thân 3", "birthday": "1989-10-24T00:00:00.000Z", "relationship": 3}]	5	6	1	5	\N	\N	2025-11-16 10:24:56.631+07	2025-11-16 10:24:56.631+07	2	1993-04-17	0960000086	hr_tl083.png	0	Vũ Thị Bình
\.


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 14, true);


--
-- Name: migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_lock_index_seq', 1, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 22, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 640, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 131, true);


--
-- Name: email_templates email_templates_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_key_unique UNIQUE (key);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


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
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: permissions_createdby_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permissions_createdby_index ON public.permissions USING btree ("createdBy");


--
-- Name: role_permissions_createdby_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX role_permissions_createdby_index ON public.role_permissions USING btree ("createdBy");


--
-- Name: role_permissions_permissionid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX role_permissions_permissionid_index ON public.role_permissions USING btree ("permissionId");


--
-- Name: role_permissions_roleid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX role_permissions_roleid_index ON public.role_permissions USING btree ("roleId");


--
-- Name: roles_createdby_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX roles_createdby_index ON public.roles USING btree ("createdBy");


--
-- Name: roles_updatedby_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX roles_updatedby_index ON public.roles USING btree ("updatedBy");


--
-- Name: permissions permissions_createdby_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_createdby_foreign FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_createdby_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_createdby_foreign FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permissionid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permissionid_foreign FOREIGN KEY ("permissionId") REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_roleid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_roleid_foreign FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: roles roles_createdby_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_createdby_foreign FOREIGN KEY ("createdBy") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: roles roles_updatedby_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_updatedby_foreign FOREIGN KEY ("updatedBy") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_createdby_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_createdby_foreign FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_roleid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_roleid_foreign FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_updatedby_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_updatedby_foreign FOREIGN KEY ("updatedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict U2FFxhbUvnARFckbiJQUdMRfB0oBKClXvk1GE4w0XxYlbbo4ACTR6s1VI6X7heN

