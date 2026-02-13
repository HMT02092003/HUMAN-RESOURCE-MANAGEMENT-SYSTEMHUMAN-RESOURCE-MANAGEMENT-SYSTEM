--
-- PostgreSQL database dump
--

\restrict Mwk8icYkraiZLumCF4fMSB2wS53c8U2IKRMZPmedfQL1hghTQIZ6g1Sqkli33of

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cvs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cvs (
    cv_id uuid NOT NULL,
    user_id integer NOT NULL,
    file_path character varying(500),
    original_text text,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cvs OWNER TO postgres;

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
-- Name: project_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_expenses (
    expense_id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    amount numeric(15,2) NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    expense_date date NOT NULL,
    created_by integer,
    status text DEFAULT 'pending'::text,
    approved_by integer,
    approved_at timestamp with time zone,
    metadata json,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_expenses_category_check CHECK ((category = ANY (ARRAY['personnel'::text, 'equipment'::text, 'software'::text, 'travel'::text, 'marketing'::text, 'infrastructure'::text, 'training'::text, 'consulting'::text, 'maintenance'::text, 'other'::text]))),
    CONSTRAINT project_expenses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.project_expenses OWNER TO postgres;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_members (
    project_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(100),
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_members OWNER TO postgres;

--
-- Name: project_timeline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_timeline (
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    event_type text NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    user_id integer,
    metadata json,
    event_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_timeline_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'updated'::text, 'status_changed'::text, 'member_added'::text, 'member_removed'::text, 'task_created'::text, 'task_assigned'::text, 'task_updated'::text, 'task_deleted'::text, 'task_completed'::text, 'milestone_reached'::text, 'budget_updated'::text, 'comment_added'::text, 'deleted'::text, 'manager_changed'::text, 'progress_updated'::text])))
);


ALTER TABLE public.project_timeline OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    project_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status text DEFAULT 'planning'::text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    budget numeric(15,2) DEFAULT '0'::numeric,
    spent numeric(15,2) DEFAULT '0'::numeric,
    customer character varying(255),
    progress integer DEFAULT 0,
    manager_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['planning'::text, 'active'::text, 'on_hold'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_project_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_project_id_seq OWNER TO postgres;

--
-- Name: projects_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_project_id_seq OWNED BY public.projects.project_id;


--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    skill_id integer NOT NULL,
    skill_name character varying(100) NOT NULL
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: skills_skill_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.skills_skill_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.skills_skill_id_seq OWNER TO postgres;

--
-- Name: skills_skill_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.skills_skill_id_seq OWNED BY public.skills.skill_id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    task_id character varying(64) NOT NULL,
    project_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status text DEFAULT 'todo'::text,
    priority text DEFAULT 'medium'::text,
    assignee_id integer,
    due_date date,
    estimated_hours integer DEFAULT 0,
    actual_hours integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    start_date date,
    depends_on json,
    ai_metadata json,
    estimated_days integer DEFAULT 0,
    completed_at timestamp with time zone,
    approved_by integer,
    approved_at timestamp with time zone,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'pending_approval'::text, 'done'::text])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: user_kpi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_kpi (
    kpi_id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer NOT NULL,
    task_id character varying(50) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    completion_status text NOT NULL,
    delay_days integer,
    completed_at timestamp with time zone NOT NULL,
    due_date timestamp with time zone,
    approved_at timestamp with time zone NOT NULL,
    approved_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_kpi_completion_status_check CHECK ((completion_status = ANY (ARRAY['early'::text, 'on_time'::text, 'late'::text])))
);


ALTER TABLE public.user_kpi OWNER TO postgres;

--
-- Name: COLUMN user_kpi.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.user_id IS 'ID người dùng';


--
-- Name: COLUMN user_kpi.project_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.project_id IS 'ID dự án';


--
-- Name: COLUMN user_kpi.task_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.task_id IS 'ID task';


--
-- Name: COLUMN user_kpi.month; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.month IS 'Tháng (1-12)';


--
-- Name: COLUMN user_kpi.year; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.year IS 'Năm';


--
-- Name: COLUMN user_kpi.completion_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.completion_status IS 'Trạng thái hoàn thành: early=vượt tiến độ, on_time=đúng hạn, late=chậm tiến độ';


--
-- Name: COLUMN user_kpi.delay_days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.delay_days IS 'Số ngày chậm/sớm (âm=sớm, dương=chậm)';


--
-- Name: COLUMN user_kpi.completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.completed_at IS 'Thời gian hoàn thành task';


--
-- Name: COLUMN user_kpi.due_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.due_date IS 'Deadline của task';


--
-- Name: COLUMN user_kpi.approved_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.approved_at IS 'Thời gian duyệt task';


--
-- Name: COLUMN user_kpi.approved_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_kpi.approved_by IS 'Người duyệt';


--
-- Name: user_kpi_kpi_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_kpi_kpi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_kpi_kpi_id_seq OWNER TO postgres;

--
-- Name: user_kpi_kpi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_kpi_kpi_id_seq OWNED BY public.user_kpi.kpi_id;


--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_skills (
    user_id integer NOT NULL,
    skill_id integer NOT NULL,
    proficiency_level character varying(5)
);


ALTER TABLE public.user_skills OWNER TO postgres;

--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Name: projects project_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN project_id SET DEFAULT nextval('public.projects_project_id_seq'::regclass);


--
-- Name: skills skill_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills ALTER COLUMN skill_id SET DEFAULT nextval('public.skills_skill_id_seq'::regclass);


--
-- Name: user_kpi kpi_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kpi ALTER COLUMN kpi_id SET DEFAULT nextval('public.user_kpi_kpi_id_seq'::regclass);


--
-- Data for Name: cvs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cvs (cv_id, user_id, file_path, original_text, uploaded_at) FROM stdin;
121392d3-e7b0-4edc-b0d5-071d80e68e1e	9	uploads\\1762791434599-567627264-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2025-11-10 23:17:14.523+07
2478ea5c-10ab-4253-8914-4a5baeaf0daf	12	uploads\\1762791449627-336444499-DangTranSon_CV.pdf	Đặng Trần Sơn\nIntern\nThông tin cá nhân\n 29/11/2003\n Nam\n 0868 661 359\n✉ sontrandang189@gmail.com\n https://github.com/ClydeCage\n Quận Hà Đông, thành phố Hà Nội\nCác kỹ năng\nNgôn ngữ lập trình:\nJava, TypeScript, C#\nCông cụ:\nUnity, Visual Studio Code, Adobe\nIlustrator/Photoshop, Asesprite\nKỹ năng thiết kế :\nThiết kế giao diện website - game 2D/3D, tạo\npixel art, dựng sprite animation\nNgoại ngữ:\nKỹ năng Ngoại ngữ ở mức khá tốt, có thể giao\ntiếp và đọc dịch tốt tài liệu kỹ thuật\nKỹ năng làm việc nhóm, thuyết trình...\nMục tiêu nghề nghiệp\nLà sinh viên năm 4 ngành Công nghệ Thông tin, bản thân định\nhướng phát triển trong lĩnh vực thiết kế, phát triển game và nội\ndung số. Có kinh nghiệm với Unity, cùng kiến thức cơ bản về lập\ntrình và thiết kế giao diện. Mong muốn thực tập để nâng cao kỹ\nnăng và tham gia các dự án sáng tạo.\nHọc vấn\nTrường Đại học kiến trúc Hà Nội \t2121 - 2026\nChuyên ngành: Công nghệ thông tin\nChứng chỉ MOS Specialist: Word, Excel, PowerPoint\nDự án liên quan\nApp quản lí phòng tập \t11/11/2024 - 5/1/2025\nNgôn ngữ sử dụng: Java\nApp quản lí phòng tập là một app android giới thiệu và quản lí các\nphòng tập gym.\nGame Beat Saber - clone \t2/9/2024 - 13/10/2024\nNgôn ngữ sử dụng: C#\nVị trí: Designer, Back - end Developer\nClone của tựa game Beat Saber nổi tiếng, một game âm nhạc thực\ntế ảo (VR) sử dụng hành động chém với các nhịp điệu.\nGame Recommender System \t22/4/2024 - 16/6/2024\nNgôn ngữ sử dụng: Python\nVị trí: Designer\nGame Recommender System là một website giúp người dùng tìm\nkiếm và được đề xuất các trò chơi phù hợp với sở thích.\nHoạt động\nTrưởng ban truyền thông \t2021 - 2024\nCLB sáo trúc, ĐH Kiến Trúc Hà nội\nThiết kế bài viết truyền thông, banner, logo cho CLB\nQuản lí nhân sự và các hoạt động truyền thông của clb\n© topcv.vn\n\n-- 1 of 1 --\n\n	2025-11-10 23:17:29.583+07
8378a2e2-ebc8-4f51-9529-428f6d0894dd	18	uploads\\1762791489648-676872956-MToan-H-TopCV.vn-011125.04922.pdf	 0823900776\n✉ hoangmanhtoan02092003@gma\nil.com\n Bắc Từ Liêm, Hà Nội\nHỌC VẤN\nTrường Đại học TopCV\n(2018 - 2022)\nCông nghệ thông tin\nXếp loại: Xuất sắc\nKỸ NĂNG\nKỹ năng làm việc nhóm\nCó kinh nghiệm làm việc liên phòng\nban.\nKỹ năng giải quyết vấn đề\nCó kinh nghiệm phân tích và đưa ra\ngiải pháp hiệu quả cho các sự cố kỹ\nthuật phức tạp.\nKỹ năng ngoại ngữ\nCó thể đọc hiểu tài liệu kỹ thuật bằng\ntiếng Anh.\nKỹ năng quản lý thời gian\nCó kinh nghiệm sắp xếp các yêu cầu\ntừ nhiều phòng ban theo mức độ ưu\ntiên nhằm xử lý hiệu quả hiều yêu cầu\nhỗ trợ cùng lúc.\nCHỨNG CHỈ\n2024\nCompTIA IT Operations Specialist (IT\nOps)\nSỞ THÍCH\nĐọc sách - Nấu ăn - Du lịch\nMỤC TIÊU NGHỀ NGHIỆP\nIT Helpdesk với 03 năm kinh nghiệm làm việc tại tập đoàn công nghệ MW Group,\nthành thạo trong việc xử lý sự cố liên quan đến phần cứng/phần mềm và mạng máy\ntính giúp giảm 20% thời gian xử lý yêu cầu và nâng cao mức độ hài lòng của nhân sự\ncông ty lên 95%. Trong 3 năm tới, tôi hướng đến mục tiêu trở thành Chuyên viên IT\nHelpdesk giúp tối ưu hóa quy trình hỗ trợ kỹ thuật, nâng cao trải nghiệm người dùng\nvà đóng góp tích cực vào sự phát triển của doanh nghiệp.\nKINH NGHIỆM LÀM VIỆC\nMW Group\nIT Helpdesk \t2023 - Nay\n• Xử lý, giải quyết hơn 20 yêu cầu hỗ trợ mỗi ngày của nhân viên trong công ty liên\nquan đến công nghệ như phần cứng/phần mềm máy tính, mạng máy tính, thiết bị\nvăn phòng.\n• Cấp phát máy tính, cài đặt máy tính cho nhân viên mới (hệ điều hành, email, máy\nin, phần mềm văn phòng, cáp mạng, v.vv..) và thực hiện thu hồi máy tính khi nhân\nviên nghỉ việc.\n• Tham gia xác định và áp dụng các giải pháp nhằm tối ưu hóa chi phí, đảm bảo\nan toàn hạ tầng bảo mật và hệ thống máy chủ của công ty.\n• Hướng dẫn sử dụng, đào tạo và giải đáp thắc mắc của nhân sự công ty trong quá\ntrình sử dụng, hỗ trợ người dùng khi xảy ra các vấn đề.\n• Lập báo cáo về các sự cố, kết quả xử lý và đề xuất cải tiến hệ thống.\nMW Group\nThực tập sinh IT Helpdesk \t2022 - 2022\n• Hỗ trợ thực hiện các công việc lắp ráp, cài đặt, kiểm tra và khắc phục sự cố\nphần cứng và phần mềm máy tính cơ bản.\n• Hỗ trợ cài đặt hệ điều hành, phần mềm ứng dụng, thiết bị CNTT cho nhân viên\nmới.\n• Hỗ trợ đội ngũ IT trong việc bảo trì hệ thống máy chủ, cơ sở hạ tầng mạng (LAN,\nWAN) và các dịch vụ như File Server, Domain Controller.\n• Thực hiện các đầu việc khác theo sự phân công của Cấp trên.\nDANH HIỆU VÀ GIẢI THƯỞNG\nEmployee of the Year Award \t2024\nHOẠT ĐỘNG\nCLB Tiếng Anh TopCV\nCo-Leader \t2019 - 2022\n• Tổ chức các hoạt động giao lưu nói tiếng Anh mỗi thứ 6 cách tuần.\n• Tổ chức các cuộc thi hùng biện tiếng Anh trong phạm vi nội bộ.\nM.Toàn H.\nIT Helpdesk\n\n-- 1 of 2 --\n\nNGƯỜI GIỚI THIỆU\nĐỗ Quỳnh Mai - HR Director - MW Group - Tel.: (024) 6680 5588 \t© topcv.vn\n\n-- 2 of 2 --\n\n	2025-11-10 23:18:09.635+07
b232f646-696c-46dc-b33a-ef214ebb779d	25	uploads\\1762791510417-822473180-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2025-11-10 23:18:30.372+07
27c18bf3-649a-442e-b234-94fc28740095	29	uploads\\1762791527412-92477510-DangTranSon_CV.pdf	Đặng Trần Sơn\nIntern\nThông tin cá nhân\n 29/11/2003\n Nam\n 0868 661 359\n✉ sontrandang189@gmail.com\n https://github.com/ClydeCage\n Quận Hà Đông, thành phố Hà Nội\nCác kỹ năng\nNgôn ngữ lập trình:\nJava, TypeScript, C#\nCông cụ:\nUnity, Visual Studio Code, Adobe\nIlustrator/Photoshop, Asesprite\nKỹ năng thiết kế :\nThiết kế giao diện website - game 2D/3D, tạo\npixel art, dựng sprite animation\nNgoại ngữ:\nKỹ năng Ngoại ngữ ở mức khá tốt, có thể giao\ntiếp và đọc dịch tốt tài liệu kỹ thuật\nKỹ năng làm việc nhóm, thuyết trình...\nMục tiêu nghề nghiệp\nLà sinh viên năm 4 ngành Công nghệ Thông tin, bản thân định\nhướng phát triển trong lĩnh vực thiết kế, phát triển game và nội\ndung số. Có kinh nghiệm với Unity, cùng kiến thức cơ bản về lập\ntrình và thiết kế giao diện. Mong muốn thực tập để nâng cao kỹ\nnăng và tham gia các dự án sáng tạo.\nHọc vấn\nTrường Đại học kiến trúc Hà Nội \t2121 - 2026\nChuyên ngành: Công nghệ thông tin\nChứng chỉ MOS Specialist: Word, Excel, PowerPoint\nDự án liên quan\nApp quản lí phòng tập \t11/11/2024 - 5/1/2025\nNgôn ngữ sử dụng: Java\nApp quản lí phòng tập là một app android giới thiệu và quản lí các\nphòng tập gym.\nGame Beat Saber - clone \t2/9/2024 - 13/10/2024\nNgôn ngữ sử dụng: C#\nVị trí: Designer, Back - end Developer\nClone của tựa game Beat Saber nổi tiếng, một game âm nhạc thực\ntế ảo (VR) sử dụng hành động chém với các nhịp điệu.\nGame Recommender System \t22/4/2024 - 16/6/2024\nNgôn ngữ sử dụng: Python\nVị trí: Designer\nGame Recommender System là một website giúp người dùng tìm\nkiếm và được đề xuất các trò chơi phù hợp với sở thích.\nHoạt động\nTrưởng ban truyền thông \t2021 - 2024\nCLB sáo trúc, ĐH Kiến Trúc Hà nội\nThiết kế bài viết truyền thông, banner, logo cho CLB\nQuản lí nhân sự và các hoạt động truyền thông của clb\n© topcv.vn\n\n-- 1 of 1 --\n\n	2025-11-10 23:18:47.389+07
59e0d87c-00e4-4c85-814d-b190a4eaa93d	21	uploads\\1762791553074-172734975-MToan-H-TopCV.vn-011125.04922.pdf	 0823900776\n✉ hoangmanhtoan02092003@gma\nil.com\n Bắc Từ Liêm, Hà Nội\nHỌC VẤN\nTrường Đại học TopCV\n(2018 - 2022)\nCông nghệ thông tin\nXếp loại: Xuất sắc\nKỸ NĂNG\nKỹ năng làm việc nhóm\nCó kinh nghiệm làm việc liên phòng\nban.\nKỹ năng giải quyết vấn đề\nCó kinh nghiệm phân tích và đưa ra\ngiải pháp hiệu quả cho các sự cố kỹ\nthuật phức tạp.\nKỹ năng ngoại ngữ\nCó thể đọc hiểu tài liệu kỹ thuật bằng\ntiếng Anh.\nKỹ năng quản lý thời gian\nCó kinh nghiệm sắp xếp các yêu cầu\ntừ nhiều phòng ban theo mức độ ưu\ntiên nhằm xử lý hiệu quả hiều yêu cầu\nhỗ trợ cùng lúc.\nCHỨNG CHỈ\n2024\nCompTIA IT Operations Specialist (IT\nOps)\nSỞ THÍCH\nĐọc sách - Nấu ăn - Du lịch\nMỤC TIÊU NGHỀ NGHIỆP\nIT Helpdesk với 03 năm kinh nghiệm làm việc tại tập đoàn công nghệ MW Group,\nthành thạo trong việc xử lý sự cố liên quan đến phần cứng/phần mềm và mạng máy\ntính giúp giảm 20% thời gian xử lý yêu cầu và nâng cao mức độ hài lòng của nhân sự\ncông ty lên 95%. Trong 3 năm tới, tôi hướng đến mục tiêu trở thành Chuyên viên IT\nHelpdesk giúp tối ưu hóa quy trình hỗ trợ kỹ thuật, nâng cao trải nghiệm người dùng\nvà đóng góp tích cực vào sự phát triển của doanh nghiệp.\nKINH NGHIỆM LÀM VIỆC\nMW Group\nIT Helpdesk \t2023 - Nay\n• Xử lý, giải quyết hơn 20 yêu cầu hỗ trợ mỗi ngày của nhân viên trong công ty liên\nquan đến công nghệ như phần cứng/phần mềm máy tính, mạng máy tính, thiết bị\nvăn phòng.\n• Cấp phát máy tính, cài đặt máy tính cho nhân viên mới (hệ điều hành, email, máy\nin, phần mềm văn phòng, cáp mạng, v.vv..) và thực hiện thu hồi máy tính khi nhân\nviên nghỉ việc.\n• Tham gia xác định và áp dụng các giải pháp nhằm tối ưu hóa chi phí, đảm bảo\nan toàn hạ tầng bảo mật và hệ thống máy chủ của công ty.\n• Hướng dẫn sử dụng, đào tạo và giải đáp thắc mắc của nhân sự công ty trong quá\ntrình sử dụng, hỗ trợ người dùng khi xảy ra các vấn đề.\n• Lập báo cáo về các sự cố, kết quả xử lý và đề xuất cải tiến hệ thống.\nMW Group\nThực tập sinh IT Helpdesk \t2022 - 2022\n• Hỗ trợ thực hiện các công việc lắp ráp, cài đặt, kiểm tra và khắc phục sự cố\nphần cứng và phần mềm máy tính cơ bản.\n• Hỗ trợ cài đặt hệ điều hành, phần mềm ứng dụng, thiết bị CNTT cho nhân viên\nmới.\n• Hỗ trợ đội ngũ IT trong việc bảo trì hệ thống máy chủ, cơ sở hạ tầng mạng (LAN,\nWAN) và các dịch vụ như File Server, Domain Controller.\n• Thực hiện các đầu việc khác theo sự phân công của Cấp trên.\nDANH HIỆU VÀ GIẢI THƯỞNG\nEmployee of the Year Award \t2024\nHOẠT ĐỘNG\nCLB Tiếng Anh TopCV\nCo-Leader \t2019 - 2022\n• Tổ chức các hoạt động giao lưu nói tiếng Anh mỗi thứ 6 cách tuần.\n• Tổ chức các cuộc thi hùng biện tiếng Anh trong phạm vi nội bộ.\nM.Toàn H.\nIT Helpdesk\n\n-- 1 of 2 --\n\nNGƯỜI GIỚI THIỆU\nĐỗ Quỳnh Mai - HR Director - MW Group - Tel.: (024) 6680 5588 \t© topcv.vn\n\n-- 2 of 2 --\n\n	2025-11-10 23:19:13.05+07
7d817cd0-8ac3-404b-a09b-cc28fa03776b	27	uploads\\1763456474157-301928406-MToan-H-TopCV.vn-011125.04922.pdf	 0823900776\n✉ hoangmanhtoan02092003@gma\nil.com\n Bắc Từ Liêm, Hà Nội\nHỌC VẤN\nTrường Đại học TopCV\n(2018 - 2022)\nCông nghệ thông tin\nXếp loại: Xuất sắc\nKỸ NĂNG\nKỹ năng làm việc nhóm\nCó kinh nghiệm làm việc liên phòng\nban.\nKỹ năng giải quyết vấn đề\nCó kinh nghiệm phân tích và đưa ra\ngiải pháp hiệu quả cho các sự cố kỹ\nthuật phức tạp.\nKỹ năng ngoại ngữ\nCó thể đọc hiểu tài liệu kỹ thuật bằng\ntiếng Anh.\nKỹ năng quản lý thời gian\nCó kinh nghiệm sắp xếp các yêu cầu\ntừ nhiều phòng ban theo mức độ ưu\ntiên nhằm xử lý hiệu quả hiều yêu cầu\nhỗ trợ cùng lúc.\nCHỨNG CHỈ\n2024\nCompTIA IT Operations Specialist (IT\nOps)\nSỞ THÍCH\nĐọc sách - Nấu ăn - Du lịch\nMỤC TIÊU NGHỀ NGHIỆP\nIT Helpdesk với 03 năm kinh nghiệm làm việc tại tập đoàn công nghệ MW Group,\nthành thạo trong việc xử lý sự cố liên quan đến phần cứng/phần mềm và mạng máy\ntính giúp giảm 20% thời gian xử lý yêu cầu và nâng cao mức độ hài lòng của nhân sự\ncông ty lên 95%. Trong 3 năm tới, tôi hướng đến mục tiêu trở thành Chuyên viên IT\nHelpdesk giúp tối ưu hóa quy trình hỗ trợ kỹ thuật, nâng cao trải nghiệm người dùng\nvà đóng góp tích cực vào sự phát triển của doanh nghiệp.\nKINH NGHIỆM LÀM VIỆC\nMW Group\nIT Helpdesk \t2023 - Nay\n• Xử lý, giải quyết hơn 20 yêu cầu hỗ trợ mỗi ngày của nhân viên trong công ty liên\nquan đến công nghệ như phần cứng/phần mềm máy tính, mạng máy tính, thiết bị\nvăn phòng.\n• Cấp phát máy tính, cài đặt máy tính cho nhân viên mới (hệ điều hành, email, máy\nin, phần mềm văn phòng, cáp mạng, v.vv..) và thực hiện thu hồi máy tính khi nhân\nviên nghỉ việc.\n• Tham gia xác định và áp dụng các giải pháp nhằm tối ưu hóa chi phí, đảm bảo\nan toàn hạ tầng bảo mật và hệ thống máy chủ của công ty.\n• Hướng dẫn sử dụng, đào tạo và giải đáp thắc mắc của nhân sự công ty trong quá\ntrình sử dụng, hỗ trợ người dùng khi xảy ra các vấn đề.\n• Lập báo cáo về các sự cố, kết quả xử lý và đề xuất cải tiến hệ thống.\nMW Group\nThực tập sinh IT Helpdesk \t2022 - 2022\n• Hỗ trợ thực hiện các công việc lắp ráp, cài đặt, kiểm tra và khắc phục sự cố\nphần cứng và phần mềm máy tính cơ bản.\n• Hỗ trợ cài đặt hệ điều hành, phần mềm ứng dụng, thiết bị CNTT cho nhân viên\nmới.\n• Hỗ trợ đội ngũ IT trong việc bảo trì hệ thống máy chủ, cơ sở hạ tầng mạng (LAN,\nWAN) và các dịch vụ như File Server, Domain Controller.\n• Thực hiện các đầu việc khác theo sự phân công của Cấp trên.\nDANH HIỆU VÀ GIẢI THƯỞNG\nEmployee of the Year Award \t2024\nHOẠT ĐỘNG\nCLB Tiếng Anh TopCV\nCo-Leader \t2019 - 2022\n• Tổ chức các hoạt động giao lưu nói tiếng Anh mỗi thứ 6 cách tuần.\n• Tổ chức các cuộc thi hùng biện tiếng Anh trong phạm vi nội bộ.\nM.Toàn H.\nIT Helpdesk\n\n-- 1 of 2 --\n\nNGƯỜI GIỚI THIỆU\nĐỗ Quỳnh Mai - HR Director - MW Group - Tel.: (024) 6680 5588 \t© topcv.vn\n\n-- 2 of 2 --\n\n	2025-11-18 16:01:14.08+07
7ceb3edb-c7db-4461-8e6d-c3321278a0b6	113	uploads\\1768574419278-349789054-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2026-01-16 21:40:19.102+07
d139345b-c082-4d03-a0bd-502855845a05	104	uploads\\1768582007622-7883117-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2026-01-17 02:32:22.019+07
78b76651-7e88-4cec-b5c8-3a0fcd9e04d6	95	uploads\\1768655880284-255050296-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2026-01-17 20:20:11.532+07
1c5aff36-94c8-43c5-8dbc-7bf51c0c8e02	93	uploads\\1768678468102-450247924-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2026-01-18 02:34:52.923+07
ad2060c1-3b6a-4fbe-9ee8-d3314e136a90	128	uploads/1769369194264-289868512-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2026-01-26 11:43:06.595+07
dc6a430a-da51-4935-a144-f4e624bcdb87	124	uploads/1769405251643-208328100-Nguyen-Hoang-Cam-CV-BA-Intern.pdf	Nguyễn Hoàng Cầm\nIntern\nPersonal Information\n 11/08/2003\n Male\n 0356353839\n✉ phuongliet010@gmail.com\n https://github.com/HCamote\n Thanh Xuan District, Hanoi, Vietnam\nSkills:\nAnalytical Skills:\nExperienced in analyzing user requirements\nand interpreting BRDs. Skilled in creating\nBPMN, Use Case, and Flowcharts to visualize\nbusiness processes.\nProgramming Language:\nJava, TypeScript, C#, Javascript\nTools:\nUnity, Visual Studio Code,Android\nstudio,Postman, Selenium\nDatabase Management Systems (DBMS)\nMySQL, PostgreSQL, Mongodb\nDesign Skills:\nSkilled in UI design for websites, mobile apps,\nand 2D/3D games, with a solid understanding\nof user experience and responsive layout\nprinciples.\nSoftware Testing Skills:\nCareer Objective\nAs a nal-year Information Technology student, I am seeking an\nopportunity as a Business Analyst Intern to apply my analytical\nskills and understanding of software development, while gaining\npractical experience in requirements gathering, documentation,\nand stakeholder communication\nEducation\nHanoi Architectural University – Vietnam\t\n2021 -\n2026\nMajor: Information Technology\nFinal-year student (Class of 2025)\nGPA: 2.92 / 4.0\nActivities\nComputer e-commerce system\t\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/Website-b-n-thi-t-b-i-n-\nt-.git\nRoles:Full-stack Developer, Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented both frontend and backend features\nusing React and Node.js.\n• Developed user interfaces.\n• Built admin dashboards to manage users, orders, and products.\n• Integrated PostgreSQL\n• Performed automated UI testing using Selenium and conducted\nAPI testing with Postman to validate key user flows and ensure\nsystem functionality.\n• Fixed bugs related to UI rendering and API response handling.\n• Improved user experience by optimizing performance and\nresolving layout issues.\nGame RPG\t\n2/9/2024 -\n13/10/2024\nProgramming Language Used: C#\nGithub: https://github.com/HCamote/RPG-Game.git\nRoles: Designer, Tester\n• Designing engaging game levels, character progression\nsystems, and intuitive user interface layouts to enhance player\nexperience.\n\n-- 1 of 3 --\n\nProcient in software testing with knowledge\nof the development lifecycle. Experienced in\nwriting test cases, nding bugs, and working\nwith developers to ensure quality.\nBA Tools & Skills:\nRequirement Documentation, UML, Figma,\nDraw.io, Agile/Scrum, Excel\nLanguages:\nKorean: Procient – fluent in speaking,\nreading, and writing\nEnglish: Procient – able to read, write, and\ntranslate documents\nSoft Skills:\nStrong communication skills\nLogical and critical thinking\nTeamwork and collaboration\n• Creating visual concepts and ensuring consistency in game\naesthetics, including environment design, character\nappearance, and HUD elements.\n• Collaborating with developers to align game design with\ntechnical feasibility and gameplay mechanics.\n• Conducting thorough gameplay testing to identify bugs,\nbalance issues, and user experience problems.\n• Documenting and reporting issues, then retesting after xes to\nensure stability and smooth performance.\nApp introducing traditional\nVietnamese dishes\n22/4/2024 -\n16/6/2024\nProgramming Language Used: Java\nGithub: https://github.com/HCamote/Android-app.git\nRoles: Full-stack Developer, Tester\n• Developed user interface using XML and Java for displaying\ndish categories, images, descriptions, and ingredients.\n• Implemented backend logic to manage dish data and lter\ncontent by region or category.\n• Integrated Firebase store database for local storage and fast\nretrieval of dish information.\n• Wrote unit tests and performed manual testing to verify\nfunctionality and x UI/UX bugs.\n• Improved app responsiveness and ensured compatibility across\ndierent Android versions.\nWebsite Daily Meal Suggestions\nfor Family\n11/11/2024 -\n5/1/2025\nProgramming Language Used: TypeScript\nGithub: https://github.com/HCamote/huongdichvu.git\nRoles: Full-stack Developer,Tester\n• Gathered and analyzed functional and non-functional\nrequirements based on stakeholder needs.\n• Created user stories and workflow diagrams to clarify system\nbehavior.\n• Collaborated with the development team to ensure business\nrequirements were accurately implemented.\n• Designed and implemented the frontend using React and Ant\nDesign for browsing recipes, ingredients, and cooking\ninstructions.\n• Developed RESTful APIs with Node.js and Express to manage\nrecipes, ingredients, user preferences, and daily suggestions.\n• Integrated MongoDB for data storage and querying.\n• Created user authentication and personalized meal plan\nfeatures.\n• Conducted API testing with Postman and performed UI\nfunctional testing using Selenium to ensure a reliable user\nexperience and accurate data display.\n• Improved page performance and ensured responsiveness\nacross devices.\n© topcv.vn\n\n-- 2 of 3 --\n\n\n\n-- 3 of 3 --\n\n	2026-01-26 12:27:53.399+07
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	000_enable_pgcrypto.cjs	1	2025-11-10 15:10:16.86+07
2	001_create_skills_table.cjs	1	2025-11-10 15:10:16.875+07
3	002_create_jobs_table.cjs	1	2025-11-10 15:10:16.886+07
4	003_create_cvs_table.cjs	1	2025-11-10 15:10:16.89+07
5	004_create_user_skills_table.cjs	1	2025-11-10 15:10:16.896+07
6	005_create_job_required_skills_table.cjs	1	2025-11-10 15:10:16.901+07
7	006_create_job_suggestions_table.cjs	1	2025-11-10 15:10:16.909+07
8	007_improve_jobs_system.cjs	1	2025-11-10 15:10:16.91+07
9	008_create_project_members_table.cjs	1	2025-11-10 15:10:16.915+07
10	009_create_tasks_table.cjs	1	2025-11-10 15:10:16.923+07
11	010_create_project_timeline_table.cjs	1	2025-11-10 15:10:16.931+07
12	011_remove_review_status.cjs	2	2025-11-10 23:26:31.596+07
13	012_add_task_assigned_event_type.cjs	3	2025-11-11 22:28:54.836+07
26	010_add_estimated_days_to_tasks.cjs	4	2025-11-13 01:49:53.995+07
27	013_add_task_scheduling_fields.cjs	4	2025-11-13 01:49:53.997+07
28	013_update_project_timeline_event_types.cjs	4	2025-11-13 01:49:53.997+07
29	014_add_missing_event_types.cjs	4	2025-11-13 01:49:53.998+07
30	014_add_task_scheduling_fields.cjs	4	2025-11-13 01:49:54.023+07
31	015_add_missing_event_types.cjs	4	2025-11-13 01:49:54.027+07
34	015_add_task_deleted_event_type.cjs	5	2025-11-13 03:18:26.031+07
35	017_create_project_expenses_table.cjs	6	2025-12-10 16:03:06.006+07
36	016_remove_unused_interface.cjs	7	2025-12-22 00:31:22.56+07
37	018_update_task_status_add_approval.cjs	7	2025-12-22 00:31:22.596+07
42	021_optimize_schema_for_kpi.cjs	8	2025-12-23 18:50:28.466+07
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: project_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_expenses (expense_id, project_id, title, description, amount, category, expense_date, created_by, status, approved_by, approved_at, metadata, created_at, updated_at) FROM stdin;
8e6e51d5-c363-465c-b43f-6dcfff3c8746	3	mua server	Không	100000000.00	infrastructure	2025-12-10	\N	approved	\N	2025-12-10 16:15:15.966+07	\N	2025-12-10 16:15:05.04357+07	2025-12-10 16:15:15.973+07
b7360eca-46aa-4ecd-afd4-e2d710aa2c3e	3	trả phí cloundflare	Không	500000.00	software	2025-12-10	\N	pending	\N	\N	\N	2025-12-10 16:26:46.735391+07	2025-12-10 16:26:46.735391+07
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_members (project_id, user_id, role, joined_at) FROM stdin;
1	2	Developer	2025-11-10 15:14:44.294+07
1	53	Developer	2025-11-10 15:14:44.294+07
3	9	Phó phòng	2026-01-24 03:10:21.594+07
3	12	Team Leader	2026-01-24 03:10:21.594+07
3	18	Chuyên viên cao cấp	2026-01-24 03:10:21.594+07
3	25	Chuyên viên	2026-01-24 03:10:21.594+07
3	29	Chuyên viên	2026-01-24 03:10:21.594+07
3	21	Chuyên viên	2026-01-24 03:10:21.594+07
\.


--
-- Data for Name: project_timeline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_timeline (event_id, project_id, event_type, title, description, user_id, metadata, event_time) FROM stdin;
9a1cb121-fb34-4257-992e-304b8b885fde	1	created	Dự án được tạo	Dự án "Test Project for API Testing" đã được tạo.	1	\N	2025-11-10 15:14:44.3+07
87b137ac-cb14-4ed1-aa91-c79fcdd675bf	3	created	Dự án được tạo	Dự án "QLNS" đã được tạo.	7	\N	2025-11-10 22:13:42.571+07
06c5a688-a6bd-4f12-9f59-5b37cd2dc3b4	3	updated	Dự án được cập nhật	Dự án "QLNS" đã được cập nhật.	7	\N	2025-11-10 22:19:48.61+07
6554d489-1405-4658-8b58-e95a5838707c	3	task_created	Tạo mới task	Task "Xây dựng BE cho màn quản lí người dùng" đã được tạo thành công	7	{"task_id":"TASK20251111222933882","assignee_id":9}	2025-11-11 22:29:33.885+07
74ce8eb6-8387-4ca1-af58-778fc2ef8a10	3	task_assigned	Phân công task	Task "Xây dựng BE cho màn quản lí người dùng" được phân công cho user 9	7	{"task_id":"TASK20251111222933882","assignee_id":9}	2025-11-11 22:29:33.889+07
ca56b0bc-3aa9-4a20-bf1c-fa9d36fde021	3	task_created	Tạo mới task	Task "Xây dựng màn quán lí chấm công" đã được tạo thành công	1	{"task_id":"TASK20251112015346467","assignee_id":12}	2025-11-12 01:53:46.492+07
6b5e7470-6042-49dc-b9f1-db4d74184ba5	3	task_assigned	Phân công task	Task "Xây dựng màn quán lí chấm công" được phân công cho user 12	1	{"task_id":"TASK20251112015346467","assignee_id":12}	2025-11-12 01:53:46.506+07
94053390-c34b-4e96-a3a4-f776b727cf75	3	task_created	Tạo mới task	Task "Xây dựng BE màn quản lí chấm công" đã được tạo thành công	7	{"task_id":"TASK20251112113923217","assignee_id":25}	2025-11-12 11:39:23.248+07
82598cc1-de6a-4802-90b7-16770afdaf0e	3	task_assigned	Phân công task	Task "Xây dựng BE màn quản lí chấm công" được phân công cho user 25	7	{"task_id":"TASK20251112113923217","assignee_id":25}	2025-11-12 11:39:23.257+07
0ce1b7ad-23cf-4941-abe5-c275a88a84d4	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng màn quán lí chấm công" đã được cập nhật trạng thái thành done bởi user 12	12	{"task_id":"TASK20251112015346467","new_status":"done"}	2025-11-12 18:07:14.941+07
25ba94a1-030a-4dc3-b4c9-26c059d470a8	4	created	Dự án được tạo	Dự án "Temp Test Project" đã được tạo.	1	\N	2025-11-13 01:03:45.012+07
6737a318-5735-4772-8d89-41b4ce9c8c15	5	created	Dự án được tạo	Dự án "Temp Test Project" đã được tạo.	1	\N	2025-11-13 01:05:34.375+07
79e66eb4-a0b3-43d9-8c25-35c0c4d8c802	5	task_created	Tạo mới task	Task "Integrate OAuth2" đã được tạo thành công	1	{"task_id":"TASK20251113010535784","assignee_id":1}	2025-11-13 01:05:35.795+07
34869273-cef1-4aab-9570-3542b98e96b6	5	task_assigned	Phân công task	Task "Integrate OAuth2" được phân công cho user 1	1	{"task_id":"TASK20251113010535784","assignee_id":1}	2025-11-13 01:05:35.797+07
a15f0ec5-1cce-4429-b8b8-0882d8eabefa	6	created	Dự án được tạo	Dự án "Temp Test Project" đã được tạo.	1	\N	2025-11-13 01:06:12.146+07
6c0c7dd1-8aa9-4c0d-977b-5833978bc19f	3	task_created	Tạo mới task	Task "Xây dựng giao diện màn quản lí người dùng" đã được tạo thành công	7	{"task_id":"TASK20251113010721956","assignee_id":9}	2025-11-13 01:07:21.968+07
8d7b6409-5a58-455c-8d2e-25f732afb3ae	3	task_assigned	Phân công task	Task "Xây dựng giao diện màn quản lí người dùng" được phân công cho user 9	7	{"task_id":"TASK20251113010721956","assignee_id":9}	2025-11-13 01:07:21.972+07
148b795c-a324-4a7f-81e2-df63238a55ea	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng giao diện màn quản lí người dùng" đã được cập nhật trạng thái thành in_progress bởi user 9	9	{"task_id":"TASK20251113010721956","new_status":"in_progress"}	2025-11-13 01:11:45.77+07
07420aa5-fd80-4799-ab3f-4fe4cb2e25dc	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng giao diện màn quản lí người dùng" đã được cập nhật trạng thái thành done bởi user 9	9	{"task_id":"TASK20251113010721956","new_status":"done"}	2025-11-13 01:12:24.87+07
eace9336-71b6-46fe-a86c-603ebf6d8ba6	1	task_created	Tạo mới task	Task "Test Task từ API" đã được tạo thành công	1	{"task_id":"TASK20251113015743488","assignee_id":2}	2025-11-13 01:57:43.527+07
1082c10c-ecff-457a-8668-fc49623bdd55	1	task_assigned	Phân công task	Task "Test Task từ API" được phân công cho user 2	1	{"task_id":"TASK20251113015743488","assignee_id":2}	2025-11-13 01:57:43.535+07
eb941959-408f-421d-9bed-574594d2604e	3	task_created	Tạo mới task	Task "Xây dựng BE màn quản lí người dùng" đã được tạo thành công	7	{"task_id":"TASK20251113020120703","assignee_id":9}	2025-11-13 02:01:20.75+07
2b32c76c-12bb-445d-8dc0-f0efca37037f	3	task_assigned	Phân công task	Task "Xây dựng BE màn quản lí người dùng" được phân công cho user 9	7	{"task_id":"TASK20251113020120703","assignee_id":9}	2025-11-13 02:01:20.758+07
dc6d3bb7-d0c8-4b35-bf96-0397748c7c1a	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng BE màn quản lí người dùng" đã được cập nhật trạng thái thành in_progress bởi user 9	9	{"task_id":"TASK20251113020120703","new_status":"in_progress"}	2025-11-13 02:01:28.886+07
430c0768-f5ee-467d-acb5-abbd8ea43b61	3	task_created	Tạo mới task	Task "Xây dung màn chấm công" đã được tạo thành công	7	{"task_id":"TASK20251113021405320","assignee_id":9}	2025-11-13 02:14:05.344+07
6d040f77-dcf2-411e-83aa-a236bab189a8	3	task_assigned	Phân công task	Task "Xây dung màn chấm công" được phân công cho user 9	7	{"task_id":"TASK20251113021405320","assignee_id":9}	2025-11-13 02:14:05.347+07
a1414a6f-fe56-447e-998b-f0c29782af86	3	task_updated	Cập nhật trạng thái task	Task "Xây dung màn chấm công" đã được cập nhật trạng thái thành in_progress bởi user 9	9	{"task_id":"TASK20251113021405320","new_status":"in_progress"}	2025-11-13 02:14:10.5+07
def48cb0-7571-4638-8415-88bf882de80c	3	task_created	Tạo mới task	Task "Xây dựng AI nhận diện khuôn mặt" đã được tạo thành công	7	{"task_id":"TASK20251113021504651","assignee_id":12}	2025-11-13 02:15:04.679+07
d9572bb7-7397-400a-91b1-566bad23609a	3	task_assigned	Phân công task	Task "Xây dựng AI nhận diện khuôn mặt" được phân công cho user 12	7	{"task_id":"TASK20251113021504651","assignee_id":12}	2025-11-13 02:15:04.686+07
d17b9364-f94e-4609-acdf-a32d62cb3051	1	task_created	Tạo mới task	Task "Test Task từ API" đã được tạo thành công	1	{"task_id":"TASK20251113022200645","assignee_id":2}	2025-11-13 02:22:00.686+07
fec73205-1944-4a47-99e6-86cd8e2212a8	1	task_assigned	Phân công task	Task "Test Task từ API" được phân công cho user 2	1	{"task_id":"TASK20251113022200645","assignee_id":2}	2025-11-13 02:22:00.694+07
aa0807ec-f748-498b-a5ce-b51ae1384052	3	task_created	Tạo mới task	Task "Xây dựng BE nhận chấm công" đã được tạo thành công	7	{"task_id":"TASK20251113023129402","assignee_id":25}	2025-11-13 02:31:29.45+07
0ad0f2ed-a223-4640-b018-10827864d99d	3	task_assigned	Phân công task	Task "Xây dựng BE nhận chấm công" được phân công cho user 25	7	{"task_id":"TASK20251113023129402","assignee_id":25}	2025-11-13 02:31:29.457+07
8ccb1b4b-d6fa-4212-acc9-9708cf4cd122	3	task_created	Tạo mới task	Task "Test màn quan lí người dùng" đã được tạo thành công	7	{"task_id":"TASK20251113023823841","assignee_id":29}	2025-11-13 02:38:23.862+07
4292e7b3-9838-45bd-8c8e-ca863f83d48c	3	task_assigned	Phân công task	Task "Test màn quan lí người dùng" được phân công cho user 29	7	{"task_id":"TASK20251113023823841","assignee_id":29}	2025-11-13 02:38:23.866+07
3e64b29e-a6e2-460d-99f7-dd0875fa3a36	3	task_created	Tạo mới task	Task "Test Quick Script" đã được tạo thành công	1	{"task_id":"TASK20251113025410834","assignee_id":25}	2025-11-13 02:54:10.872+07
df68b5c6-ed09-40e8-a57e-0ba3c8678b78	3	task_assigned	Phân công task	Task "Test Quick Script" được phân công cho user 25	1	{"task_id":"TASK20251113025410834","assignee_id":25}	2025-11-13 02:54:10.88+07
290ea498-bb74-4a18-afe9-d66131072d1d	3	task_created	Tạo mới task	Task "Test No Start Date" đã được tạo thành công	1	{"task_id":"TASK20251113025411152","assignee_id":29}	2025-11-13 02:54:11.157+07
462105ce-9ddf-42c7-a373-b1a5791a3ed8	3	task_assigned	Phân công task	Task "Test No Start Date" được phân công cho user 29	1	{"task_id":"TASK20251113025411152","assignee_id":29}	2025-11-13 02:54:11.158+07
79db18ad-9da3-4839-ba0c-3be0ecf3849d	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng BE nhận chấm công" đã được cập nhật trạng thái thành in_progress bởi user 25	25	{"task_id":"TASK20251113023129402","new_status":"in_progress"}	2025-11-13 02:55:09.55+07
dd0a174a-75fb-4a8f-a0e9-fb11d9dcf004	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng AI nhận diện khuôn mặt" đã được cập nhật trạng thái thành in_progress bởi user 12	12	{"task_id":"TASK20251113021504651","new_status":"in_progress"}	2025-11-13 02:56:18.15+07
a990c34b-f068-4224-a3c1-791b235bffb2	3	task_updated	Cập nhật trạng thái task	Task "Xây dung màn chấm công" đã được cập nhật trạng thái thành done bởi user 9	9	{"task_id":"TASK20251113021405320","new_status":"done"}	2025-11-13 02:56:22.25+07
abcccade-39a2-40e5-80fd-d7cf7f71ad36	3	task_created	Tạo mới task	Task "Test Auto Calculation" đã được tạo thành công	1	{"task_id":"TASK20251113031451125","assignee_id":29}	2025-11-13 03:14:51.15+07
60e04dad-4537-49a8-bb3d-7dfb70ccc6d2	3	task_assigned	Phân công task	Task "Test Auto Calculation" được phân công cho user 29	1	{"task_id":"TASK20251113031451125","assignee_id":29}	2025-11-13 03:14:51.153+07
91ea3886-d16a-443a-988d-9b3d055403c5	3	task_created	Tạo mới task	Task "Test Task for Update/Delete" đã được tạo thành công	1	{"task_id":"TASK20251113031716051","assignee_id":29}	2025-11-13 03:17:16.092+07
55de4499-d9c4-4855-b016-840728b98d5f	3	task_assigned	Phân công task	Task "Test Task for Update/Delete" được phân công cho user 29	1	{"task_id":"TASK20251113031716051","assignee_id":29}	2025-11-13 03:17:16.1+07
3ea2eca2-61f2-4357-a61c-c8f36b6c90f9	3	task_updated	Cập nhật task	Task "Updated Task Title" đã được cập nhật	1	{"task_id":"TASK20251113031716051"}	2025-11-13 03:17:16.434+07
4acd889a-7aab-4c02-8aaa-04661c33bc97	3	task_created	Tạo mới task	Task "Test Auto Calculation" đã được tạo thành công	1	{"task_id":"TASK20251113031717678","assignee_id":29}	2025-11-13 03:17:17.682+07
cd87d30c-01dc-49a9-b2b3-04cc6a0c0171	3	task_assigned	Phân công task	Task "Test Auto Calculation" được phân công cho user 29	1	{"task_id":"TASK20251113031717678","assignee_id":29}	2025-11-13 03:17:17.683+07
b92fd535-eacc-4fd3-b93b-7d3cadc55b96	3	task_created	Tạo mới task	Task "Test Task for Update/Delete" đã được tạo thành công	1	{"task_id":"TASK20251113031844242","assignee_id":29}	2025-11-13 03:18:44.247+07
8cb2ae10-372a-4b24-8b98-7c4417874c94	3	task_assigned	Phân công task	Task "Test Task for Update/Delete" được phân công cho user 29	1	{"task_id":"TASK20251113031844242","assignee_id":29}	2025-11-13 03:18:44.249+07
db08892c-2083-4f5b-befa-9a22f5a570b6	3	task_updated	Cập nhật task	Task "Updated Task Title" đã được cập nhật	1	{"task_id":"TASK20251113031844242"}	2025-11-13 03:18:44.563+07
f2dd623f-5ba4-483b-b494-89bb83339793	3	task_deleted	Xóa task	Task "Updated Task Title" đã được xóa	1	{"task_id":"TASK20251113031844242"}	2025-11-13 03:18:45.242+07
a0b2e80f-6ffc-44f0-a178-ce8067937428	3	task_created	Tạo mới task	Task "Test Auto Calculation" đã được tạo thành công	1	{"task_id":"TASK20251113031845799","assignee_id":29}	2025-11-13 03:18:45.803+07
316a91b8-ac13-4955-8a01-8dadb7106112	3	task_assigned	Phân công task	Task "Test Auto Calculation" được phân công cho user 29	1	{"task_id":"TASK20251113031845799","assignee_id":29}	2025-11-13 03:18:45.804+07
8e4f1015-0a02-4213-9a64-6de861036704	3	task_deleted	Xóa task	Task "Xây dựng AI nhận diện khuôn mặt" đã được xóa	7	{"task_id":"TASK20251113021504651"}	2025-11-13 03:20:08.666+07
66f2b53a-968e-4c9e-968d-5e3505a505f6	3	task_deleted	Xóa task	Task "Test Auto Calculation" đã được xóa	7	{"task_id":"TASK20251113031845799"}	2025-11-13 03:20:22.379+07
9e158e99-4651-4d67-a8c9-be2457f6db48	3	task_updated	Cập nhật task	Task "Test Auto Calculation" đã được cập nhật	7	{"task_id":"TASK20251113031451125"}	2025-11-13 03:24:50.258+07
387c8509-c172-4694-9ad3-7ede85e50d7d	3	task_updated	Cập nhật task	Task "Test Quick Script" đã được cập nhật	7	{"task_id":"TASK20251113025410834"}	2025-11-13 03:25:01.714+07
1a887f49-00d2-486f-a4ec-232a1170246d	3	task_updated	Cập nhật task	Task "Test Auto Calculation123" đã được cập nhật	7	{"task_id":"TASK20251113031717678"}	2025-11-13 03:25:53.341+07
8f01dd71-57bd-40c9-a470-dd448d239cf8	3	task_updated	Cập nhật task	Task "Test Auto Calculation123" đã được cập nhật	7	{"task_id":"TASK20251113031717678"}	2025-11-13 03:26:00.495+07
b86f7a61-abd6-49ac-ba47-a35daf658403	3	task_updated	Cập nhật task	Task "Test Auto Calculation123" đã được cập nhật	7	{"task_id":"TASK20251113031717678"}	2025-11-13 03:40:16.493+07
64e37462-bb98-4f8c-b835-775e6e94d677	3	task_updated	Cập nhật task	Task "Test Auto Calculation123" đã được cập nhật	7	{"task_id":"TASK20251113031717678"}	2025-11-13 03:40:35.976+07
c4af5622-ac72-40cb-bd83-cb54823136ae	3	task_deleted	Xóa task	Task "Test Auto Calculation123" đã được xóa	7	{"task_id":"TASK20251113031717678"}	2025-11-13 03:40:39.919+07
f479288c-7501-4aaf-90dc-ea1bf7c3a808	3	task_created	Tạo mới task	Task "Task123" đã được tạo thành công	7	{"task_id":"TASK20251113034115047","assignee_id":18}	2025-11-13 03:41:15.07+07
02a1cfbd-100b-4dee-811e-4d879131dd11	3	task_assigned	Phân công task	Task "Task123" được phân công cho user 18	7	{"task_id":"TASK20251113034115047","assignee_id":18}	2025-11-13 03:41:15.071+07
90a777c7-b572-44ca-94e7-9cd5069161ca	3	task_updated	Cập nhật task	Task "Task123" đã được cập nhật	7	{"task_id":"TASK20251113034115047"}	2025-11-13 03:41:24.277+07
29fe97b4-ce2e-4671-8b99-14a0aec78d74	3	task_created	Tạo mới task	Task "xây dựng giao diện quả lí người dùng app" đã được tạo thành công	7	{"task_id":"TASK20251113034304081","assignee_id":12}	2025-11-13 03:43:04.113+07
833dbdf3-87eb-4633-8e16-dec9f25b446c	3	task_assigned	Phân công task	Task "xây dựng giao diện quả lí người dùng app" được phân công cho user 12	7	{"task_id":"TASK20251113034304081","assignee_id":12}	2025-11-13 03:43:04.116+07
e909fa9c-9e79-4b4d-bac1-c6a19948288c	3	task_deleted	Xóa task	Task "Task123" đã được xóa	7	{"task_id":"TASK20251113034115047"}	2025-11-13 03:46:03.168+07
d6575b8a-a68e-4203-a535-4c3900731f62	3	task_updated	Cập nhật trạng thái task	Task "Test No Start Date" đã được cập nhật trạng thái thành in_progress bởi user 29	29	{"task_id":"TASK20251113025411152","new_status":"in_progress"}	2025-11-13 03:46:09.659+07
5b3b3f1e-447d-4088-8168-677be218bc99	3	task_created	Tạo mới task	Task "test màn chấm công" đã được tạo thành công	7	{"task_id":"TASK20251113034729870","assignee_id":25}	2025-11-13 03:47:29.899+07
e7d8cb13-c677-4896-993c-01f7f5eb0f09	3	task_assigned	Phân công task	Task "test màn chấm công" được phân công cho user 25	7	{"task_id":"TASK20251113034729870","assignee_id":25}	2025-11-13 03:47:29.903+07
84c1be8b-6c83-4067-93b9-5d915625b60a	3	task_created	Tạo mới task	Task "test màn chấm công" đã được tạo thành công	7	{"task_id":"TASK20251113040843039","assignee_id":25}	2025-11-13 04:08:43.087+07
b3797831-3ab8-4c5a-809a-18ebf6f853ba	3	task_assigned	Phân công task	Task "test màn chấm công" được phân công cho user 25	7	{"task_id":"TASK20251113040843039","assignee_id":25}	2025-11-13 04:08:43.098+07
1cda79d8-6d9b-425d-aab6-abdcb3ed755f	3	task_deleted	Xóa task	Task "test màn chấm công" đã được xóa	7	{"task_id":"TASK20251113040843039"}	2025-11-13 14:08:30.158+07
fc02fea8-30fa-4cab-8864-3354096ab01e	3	task_created	Tạo mới task	Task "Test màn chấm công" đã được tạo thành công	7	{"task_id":"TASK20251113140944615","assignee_id":12}	2025-11-13 14:09:44.695+07
a0a824d3-4896-4c52-a393-d7f1ae4336a8	3	task_assigned	Phân công task	Task "Test màn chấm công" được phân công cho user 12	7	{"task_id":"TASK20251113140944615","assignee_id":12}	2025-11-13 14:09:44.697+07
3faa065b-36b4-4a0a-9fbb-82934dbe36f5	3	task_created	Tạo mới task	Task "gioa diện màn công việc" đã được tạo thành công	3	{"task_id":"TASK20251118160335000","assignee_id":9}	2025-11-18 16:03:35.058+07
373c5c64-badb-4723-a15a-d010831bebb9	3	task_assigned	Phân công task	Task "gioa diện màn công việc" được phân công cho user 9	3	{"task_id":"TASK20251118160335000","assignee_id":9}	2025-11-18 16:03:35.067+07
696969e7-a8ef-4486-87b1-b0d3a2109fe7	3	budget_updated	Thêm khoản chi tiêu	Khoản chi tiêu "mua server" - 100.000.000 đ	\N	{"expense_id":"8e6e51d5-c363-465c-b43f-6dcfff3c8746","amount":100000000,"category":"infrastructure"}	2025-12-10 16:15:05.109+07
a90d495a-e046-4edc-bb7e-7b447c3b212f	3	budget_updated	Duyệt chi tiêu	Đã duyệt khoản chi tiêu "mua server" - 100.000.000 đ	\N	{"expense_id":"8e6e51d5-c363-465c-b43f-6dcfff3c8746","amount":"100000000.00","action":"approved"}	2025-12-10 16:15:15.983+07
ac2d77e8-1e64-4bfa-bf93-0d471509fdb7	3	budget_updated	Thêm khoản chi tiêu	Khoản chi tiêu "trả phí cloundflare" - 500.000 đ	\N	{"expense_id":"b7360eca-46aa-4ecd-afd4-e2d710aa2c3e","amount":500000,"category":"software"}	2025-12-10 16:26:46.751+07
2ec64df6-dab1-46d9-9ef5-5bbd5f83e6a9	3	task_updated	Cập nhật trạng thái task	Task "gioa diện màn công việc" đã được cập nhật trạng thái thành in_progress bởi user 9	9	{"task_id":"TASK20251118160335000","new_status":"in_progress"}	2025-12-21 23:12:55.017+07
95f74d31-825c-4aad-8ca7-6459601d7bc7	3	task_updated	Cập nhật trạng thái task	Task "gioa diện màn công việc" đã được cập nhật trạng thái thành done bởi user 9	9	{"task_id":"TASK20251118160335000","new_status":"done"}	2025-12-21 23:12:58.605+07
e13317cf-87e1-44e1-b89a-b2f98baac65e	3	task_updated	Cập nhật trạng thái task	Task "Test No Start Date" đã được cập nhật trạng thái từ in_progress thành pending_approval	29	{"task_id":"TASK20251113025411152","old_status":"in_progress","new_status":"pending_approval"}	2025-12-22 02:04:32.34+07
10ac51aa-7f9c-400b-8f8f-f27f766b9af8	3	task_updated	Cập nhật trạng thái task	Task "Test No Start Date" đã được cập nhật trạng thái từ pending_approval thành pending_approval	29	{"task_id":"TASK20251113025411152","old_status":"pending_approval","new_status":"pending_approval"}	2025-12-22 02:05:12.961+07
f3ccd4bf-8af5-44c5-820c-16ace0dd2686	3	task_updated	Cập nhật trạng thái task	Task "Test No Start Date" đã được cập nhật trạng thái từ pending_approval thành in_progress	29	{"task_id":"TASK20251113025411152","old_status":"pending_approval","new_status":"in_progress"}	2025-12-22 15:39:22.83+07
4f4100f1-9c5f-484a-acfe-dc407854cecf	3	task_updated	Cập nhật trạng thái task	Task "Test No Start Date" đã được cập nhật trạng thái từ in_progress thành pending_approval	29	{"task_id":"TASK20251113025411152","old_status":"in_progress","new_status":"pending_approval"}	2025-12-22 15:39:27.189+07
516b7922-bc63-45f3-b66b-f422f64bd4d1	3	task_updated	Cập nhật trạng thái task	Task "Test No Start Date" đã được cập nhật trạng thái từ pending_approval thành done	29	{"task_id":"TASK20251113025411152","old_status":"pending_approval","new_status":"done"}	2025-12-22 16:42:17.635+07
f30a3ab6-dbf9-4154-ba33-33a79e14c5b5	3	task_updated	Cập nhật trạng thái task	Task "Test màn chấm công" đã được cập nhật trạng thái từ todo thành in_progress	12	{"task_id":"TASK20251113140944615","old_status":"todo","new_status":"in_progress"}	2025-12-22 18:01:04.666+07
afc9ba48-3af8-4d4c-b37b-eaed9861ff55	3	task_updated	Cập nhật trạng thái task	Task "Test màn chấm công" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20251113140944615","old_status":"in_progress","new_status":"pending_approval"}	2025-12-22 18:07:41.945+07
bf353dc1-d593-4507-8f25-6c82db0532dd	3	task_updated	Cập nhật trạng thái task	Task "Test màn chấm công" đã được cập nhật trạng thái từ pending_approval thành done	12	{"task_id":"TASK20251113140944615","old_status":"pending_approval","new_status":"done"}	2025-12-22 23:03:49.342+07
683525ad-8803-493c-9d90-497412bf0713	3	task_updated	Cập nhật trạng thái task	Task "Test màn chấm công" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20251113140944615","old_status":"in_progress","new_status":"pending_approval"}	2025-12-23 00:03:56.927+07
6d712c05-a57b-479e-a04c-dcacfed80537	3	task_updated	Cập nhật trạng thái task	Task "Test màn chấm công" đã được cập nhật trạng thái từ pending_approval thành done	12	{"task_id":"TASK20251113140944615","old_status":"pending_approval","new_status":"done"}	2025-12-23 00:09:15.428+07
d3b54895-75e6-4453-86b5-d5c69a94b41c	3	task_created	Tạo mới task	Task "xây dựng màn quản lí KPI của nhân viên" đã được tạo thành công	3	{"task_id":"TASK20251223010300113","assignee_id":9}	2025-12-23 01:03:00.182+07
7bf56495-87a8-4de4-8432-d9b37c13b1d3	3	task_assigned	Phân công task	Task "xây dựng màn quản lí KPI của nhân viên" được phân công cho user 9	3	{"task_id":"TASK20251223010300113","assignee_id":9}	2025-12-23 01:03:00.191+07
07f7fa87-a3e4-4949-a130-0469d2868902	3	task_updated	Cập nhật trạng thái task	Task "gioa diện màn công việc" đã được cập nhật trạng thái từ pending_approval thành done	9	{"task_id":"TASK20251118160335000","old_status":"pending_approval","new_status":"done"}	2025-12-23 02:39:37.253+07
59151d47-0e41-4d47-8d48-0f20688467db	3	task_updated	Cập nhật trạng thái task	Task "Test màn chấm công" đã được cập nhật trạng thái từ pending_approval thành done	12	{"task_id":"TASK20251113140944615","old_status":"pending_approval","new_status":"done"}	2025-12-23 19:04:32.631+07
e2f14af5-33d0-45fa-9648-3606a6009958	3	task_updated	Cập nhật trạng thái task	Task "Xây dung màn chấm công" đã được cập nhật trạng thái từ pending_approval thành done	9	{"task_id":"TASK20251113021405320","old_status":"pending_approval","new_status":"done"}	2025-12-23 19:07:15.696+07
d22cdb14-90f8-4d15-81e6-c62b240290c1	3	task_updated	Cập nhật trạng thái task	Task "Test màn chấm công" đã được cập nhật trạng thái từ pending_approval thành done	12	{"task_id":"TASK20251113140944615","old_status":"pending_approval","new_status":"done"}	2025-12-23 19:13:44.577+07
c74adb7f-2771-4987-9b22-334f7ceccfd5	3	task_updated	Cập nhật trạng thái task	Task "Xây dung màn chấm công" đã được cập nhật trạng thái từ pending_approval thành done	9	{"task_id":"TASK20251113021405320","old_status":"pending_approval","new_status":"done"}	2025-12-23 19:22:41.257+07
28d52e1c-3b94-49b0-8718-cd4d37035e7b	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng giao diện màn quản lí người dùng" đã được cập nhật trạng thái từ pending_approval thành done	9	{"task_id":"TASK20251113010721956","old_status":"pending_approval","new_status":"done"}	2025-12-23 20:55:02.305+07
e952a81c-524e-407b-bf85-fc3d01de20a0	3	task_updated	Cập nhật trạng thái task	Task "gioa diện màn công việc" đã được cập nhật trạng thái từ pending_approval thành done	9	{"task_id":"TASK20251118160335000","old_status":"pending_approval","new_status":"done"}	2025-12-23 20:55:04.443+07
ebb9fc69-1bd4-4271-9c9b-38e679165769	3	task_updated	Cập nhật trạng thái task	Task "xây dựng màn quản lí KPI của nhân viên" đã được cập nhật trạng thái từ todo thành in_progress	9	{"task_id":"TASK20251223010300113","old_status":"todo","new_status":"in_progress"}	2025-12-23 23:28:44.406+07
82e22008-6af4-42e0-9f5e-d1eb6ecb9a76	3	task_updated	Cập nhật trạng thái task	Task "xây dựng màn quản lí KPI của nhân viên" đã được cập nhật trạng thái từ in_progress thành pending_approval	9	{"task_id":"TASK20251223010300113","old_status":"in_progress","new_status":"pending_approval"}	2025-12-23 23:28:47.807+07
1661ff0d-05a1-426c-889e-108432b0748c	3	task_updated	Cập nhật trạng thái task	Task "xây dựng giao diện quả lí người dùng app" đã được cập nhật trạng thái từ todo thành in_progress	12	{"task_id":"TASK20251113034304081","old_status":"todo","new_status":"in_progress"}	2025-12-23 23:40:34.79+07
be8f11fb-d18f-4278-b26e-83c86605891d	3	task_updated	Cập nhật trạng thái task	Task "xây dựng giao diện quả lí người dùng app" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20251113034304081","old_status":"in_progress","new_status":"pending_approval"}	2025-12-23 23:40:36.97+07
d499beb5-d83e-4f20-9069-a125be1161e3	3	task_updated	Cập nhật trạng thái task	Task "xây dựng giao diện quả lí người dùng app" đã được cập nhật trạng thái từ pending_approval thành done	12	{"task_id":"TASK20251113034304081","old_status":"pending_approval","new_status":"done"}	2025-12-24 00:25:13.894+07
f671fcfc-a9a8-48ae-b2bd-4d4da4320587	3	task_updated	Cập nhật trạng thái task	Task "xây dựng màn quản lí KPI của nhân viên" đã được cập nhật trạng thái từ pending_approval thành done	9	{"task_id":"TASK20251223010300113","old_status":"pending_approval","new_status":"done"}	2025-12-24 00:25:17.434+07
ded641b4-2967-425c-b427-922aa2608d65	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng BE nhận chấm công" đã được cập nhật trạng thái từ in_progress thành pending_approval	25	{"task_id":"TASK20251113023129402","old_status":"in_progress","new_status":"pending_approval"}	2026-01-07 22:30:15.908+07
1986405d-4d38-4edb-a592-c0ec573a3a7d	3	task_updated	Cập nhật trạng thái task	Task "Xây dựng BE nhận chấm công" đã được cập nhật trạng thái từ pending_approval thành done	25	{"task_id":"TASK20251113023129402","old_status":"pending_approval","new_status":"done"}	2026-01-07 22:30:50.087+07
ea70b726-cf32-4044-89d7-f5594fdaddca	3	task_created	Tạo mới task	Task "Xây dụng phần thông báo" đã được tạo thành công	3	{"task_id":"TASK20260109160057976","assignee_id":12}	2026-01-09 16:00:58.09+07
a50f7738-08b3-4097-890e-abf4114a6931	3	task_assigned	Phân công task	Task "Xây dụng phần thông báo" được phân công cho user 12	3	{"task_id":"TASK20260109160057976","assignee_id":12}	2026-01-09 16:00:58.101+07
a4ce42e8-214c-4d10-8796-f9b1328a0d8c	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ todo thành in_progress	12	{"task_id":"TASK20260109160057976","old_status":"todo","new_status":"in_progress"}	2026-01-09 16:09:16.063+07
6f8e632a-8c24-4054-914d-3ea0941480b4	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 16:10:41.183+07
9700a0ad-e66c-45e4-8182-ff04e6de1dcd	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 16:17:05.623+07
c50e564c-26cb-4039-adb5-6b440da581fa	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 16:18:00.194+07
8349988c-efda-489c-99b7-232379ea9379	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 16:56:32.767+07
0dc200e2-b056-4bca-8ee0-679f16e2f622	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 17:37:26.41+07
d07cb253-3fb9-4d7e-a59e-46f32c730092	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 18:14:19.545+07
5939ba55-ca77-4ff4-908f-46c4664f3635	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 18:15:13.35+07
184b9003-7540-41f4-9c8a-51b53bf0810f	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 18:22:08.24+07
100afc3c-dbfa-4854-8258-184b738b1b0e	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 18:25:16.709+07
af707cb0-83ae-49dd-af61-68ec734ae30a	3	task_updated	Cập nhật trạng thái task	Task "Xây dụng phần thông báo" đã được cập nhật trạng thái từ in_progress thành pending_approval	12	{"task_id":"TASK20260109160057976","old_status":"in_progress","new_status":"pending_approval"}	2026-01-09 18:33:25.543+07
24443d69-452b-48ca-8339-99ef488404c1	3	task_created	Tạo mới task	Task "sửa lại giao diện màn đăng nhập hiện đại hơn" đã được tạo thành công	3	{"task_id":"TASK20260109183614971","assignee_id":9}	2026-01-09 18:36:15.01+07
45c150c8-097e-4873-bd2b-83d89ade63e9	3	task_assigned	Phân công task	Task "sửa lại giao diện màn đăng nhập hiện đại hơn" được phân công cho user 9	3	{"task_id":"TASK20260109183614971","assignee_id":9}	2026-01-09 18:36:15.013+07
d7a3de73-8391-4331-8d7e-f3cd92c6d89c	3	task_created	Tạo mới task	Task "triển khai ứng dụng" đã được tạo thành công	3	{"task_id":"TASK20260111230500792","assignee_id":18}	2026-01-11 23:05:00.88+07
f529b5cc-01aa-4d81-a2cd-0dd60779f10e	3	task_assigned	Phân công task	Task "triển khai ứng dụng" được phân công cho user 18	3	{"task_id":"TASK20260111230500792","assignee_id":18}	2026-01-11 23:05:00.892+07
1ed20dd5-f712-468d-a87a-d86cef8d6edf	3	task_updated	Cập nhật trạng thái task	Task "triển khai ứng dụng" đã được cập nhật trạng thái từ todo thành in_progress	18	{"task_id":"TASK20260111230500792","old_status":"todo","new_status":"in_progress"}	2026-01-11 23:06:53.062+07
9b1d11cc-af71-4b95-b970-e8d72a164861	3	task_updated	Cập nhật trạng thái task	Task "triển khai ứng dụng" đã được cập nhật trạng thái từ in_progress thành pending_approval	18	{"task_id":"TASK20260111230500792","old_status":"in_progress","new_status":"pending_approval"}	2026-01-11 23:07:19.647+07
74d7e273-d16e-4138-9209-a77e4155928b	3	task_created	Tạo mới task	Task "devOPs" đã được tạo thành công	3	{"task_id":"TASK20260118023912047","assignee_id":18}	2026-01-18 02:39:12.107+07
22553f49-b28e-418f-8f3f-58b6b62a1526	3	task_assigned	Phân công task	Task "devOPs" được phân công cho user 18	3	{"task_id":"TASK20260118023912047","assignee_id":18}	2026-01-18 02:39:12.118+07
1a3f89f9-3513-40e9-bace-ed3ad7249665	3	task_updated	Cập nhật task	Task "devOPs" đã được cập nhật	3	{"task_id":"TASK20260118023912047"}	2026-01-18 02:39:30.938+07
e0a69a3e-2e04-4bc7-bac6-75e0d6371d42	3	task_updated	Cập nhật trạng thái task	Task "devOPs" đã được cập nhật trạng thái từ todo thành in_progress	18	{"task_id":"TASK20260118023912047","old_status":"todo","new_status":"in_progress"}	2026-01-18 02:43:02.971+07
8257fcbe-253b-4dac-8c94-824d881fbd53	3	task_updated	Cập nhật trạng thái task	Task "devOPs" đã được cập nhật trạng thái từ in_progress thành pending_approval	18	{"task_id":"TASK20260118023912047","old_status":"in_progress","new_status":"pending_approval"}	2026-01-18 02:43:24.273+07
3baafe7f-cea6-41b2-be0e-ea8c906cfd61	3	task_updated	Cập nhật trạng thái task	Task "devOPs" đã được cập nhật trạng thái từ pending_approval thành done	18	{"task_id":"TASK20260118023912047","old_status":"pending_approval","new_status":"done"}	2026-01-18 02:43:54.286+07
ddf91dd6-9616-42d1-be4b-35d1df9b62a2	3	status_changed	Thay đổi trạng thái dự án	Trạng thái thay đổi từ planning sang active.	3	{"old_status":"planning","new_status":"active"}	2026-01-23 17:55:09.411+07
1d0e2b10-a5d2-4234-94b0-b4b9dfaa277e	3	updated	Dự án được cập nhật	Dự án "QLNS" đã được cập nhật.	3	\N	2026-01-23 17:55:09.423+07
41743700-4948-48df-84d1-c1e008220678	3	status_changed	Thay đổi trạng thái dự án	Trạng thái thay đổi từ active sang planning.	3	{"old_status":"active","new_status":"planning"}	2026-01-24 01:59:25.916+07
7f94e908-22b7-43bd-af4f-777971bbe5c8	3	updated	Dự án được cập nhật	Dự án "QLNS" đã được cập nhật.	3	\N	2026-01-24 01:59:25.926+07
0cc51657-84df-432a-a711-9b3327070244	3	task_created	Tạo mới task	Task "kiểm thử" đã được tạo thành công	3	{"task_id":"TASK20260123190439141","assignee_id":9}	2026-01-24 02:04:39.195+07
8355c0ad-9152-4fed-b44f-483da4d51658	3	task_assigned	Phân công task	Task "kiểm thử" được phân công cho user 9	3	{"task_id":"TASK20260123190439141","assignee_id":9}	2026-01-24 02:04:39.197+07
c7d367fd-5283-4197-88f0-6577970a8534	3	task_updated	Cập nhật trạng thái task	Task "triển khai ứng dụng" đã được cập nhật trạng thái từ pending_approval thành done	18	{"task_id":"TASK20260111230500792","old_status":"pending_approval","new_status":"done"}	2026-01-24 02:04:45.269+07
0c6e1555-0ec5-4816-81f4-6fbd4435816c	3	status_changed	Thay đổi trạng thái dự án	Trạng thái thay đổi từ planning sang active.	3	{"old_status":"planning","new_status":"active"}	2026-01-24 03:10:21.614+07
b8b09c51-868b-4602-98b9-2f5f28972768	3	updated	Dự án được cập nhật	Dự án "QLNS" đã được cập nhật.	3	\N	2026-01-24 03:10:21.626+07
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (project_id, name, description, status, start_date, end_date, budget, spent, customer, progress, manager_id, created_at, updated_at) FROM stdin;
1	Test Project for API Testing	This is a test project to verify the new ID schema	active	2025-11-01	2025-12-31	100000.00	60.00	Test Customer	0	1	2025-11-10 15:14:44.260767+07	2025-11-10 15:14:44.260767+07
4	Temp Test Project	Created by test script	planning	2025-11-01	2026-11-01	0.00	365.00	\N	0	1	2025-11-13 01:03:44.991355+07	2025-11-13 01:03:44.991355+07
5	Temp Test Project	Created by test script	planning	2025-11-01	2026-11-01	0.00	365.00	\N	0	1	2025-11-13 01:05:34.347117+07	2025-11-13 01:05:34.347117+07
6	Temp Test Project	Created by test script	planning	2025-11-01	2026-11-01	0.00	365.00	\N	0	1	2025-11-13 01:06:12.144107+07	2025-11-13 01:06:12.144107+07
3	QLNS	Web App QLNS Hatch	active	2025-11-01	2026-11-01	1000000000.00	100000365.00	Nguyễn Hữu Bằng	0	3	2025-11-10 22:13:42.535665+07	2025-11-10 22:13:42.535665+07
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skills (skill_id, skill_name) FROM stdin;
1	React
2	Next.js
3	TypeScript
4	Ant Design
5	REST API
6	Git
7	REST API Consumption
8	Analytical Skills
9	Java
10	C#
11	Javascript
12	Unity
13	Visual Studio Code
14	Android Studio
15	Postman
16	Selenium
17	MySQL
18	PostgreSQL
19	MongoDB
20	UI Design
21	Software Testing
22	Requirement Documentation
23	UML
24	Figma
25	Draw.io
26	Agile/Scrum
27	Excel
28	Korean
29	English
30	Communication Skills
31	Critical Thinking
32	Teamwork
33	Collaboration
34	Adobe Ilustrator
35	Adobe Photoshop
36	Asesprite
37	Thiết kế giao diện website
38	game 2D/3D
39	tạo pixel art
40	dựng sprite animation
41	Làm việc nhóm
42	Thuyết trình
43	Word
44	PowerPoint
45	Python
46	Back-end Developer
47	Designer
48	Kỹ năng làm việc nhóm
49	Kỹ năng giải quyết vấn đề
50	Kỹ năng ngoại ngữ
51	Kỹ năng quản lý thời gian
52	Xử lý sự cố phần cứng/phần mềm
53	Mạng máy tính
54	Cài đặt máy tính
55	Mongodb
56	UI design
57	Communication
58	Logical Thinking
59	Node.js
60	Express
61	RESTful APIs
62	XML
63	Firebase
64	Thiết kế game 2D
65	Thiết kế game 3D
66	Pixel art
67	Sprite animation
68	Xử lý sự cố phần cứng
69	Xử lý sự cố phần mềm
70	Xử lý sự cố mạng máy tính
71	Hệ điều hành
72	Bảo trì hệ thống máy chủ
73	Bảo trì cơ sở hạ tầng mạng (LAN, WAN)
74	File Server
75	Domain Controller
76	Express.js
77	Knex.js
78	Unit Testing
79	Data Validation
80	REST API Design
81	Facial Recognition API Integration
82	AI/ML API Integration
83	Machine Learning
84	ORM
85	Objection.js
86	SQL
87	SQL / Database
88	AI/Machine Learning (Face Recognition)
89	Docker
90	Testing (Unit/Integration)
91	CI/CD
92	AI nhận diện khuôn mặt (Face Recognition)
93	RESTful API Design
94	AWS/Google Cloud/Azure (Optional)
95	Ant Design (Antd)
96	Quản lý trạng thái (Redux, Zustand, Context)
97	Testing Library
98	CRUD Operations
99	API Design (RESTful)
100	Backend Development (Node.js/Express)
101	Database (PostgreSQL/MongoDB)
102	JWT (JSON Web Token)
103	bcrypt (or similar hashing algorithm)
104	Database (e.g., PostgreSQL, MongoDB)
105	React (or similar framework)
106	Authentication concepts (JWT, refresh tokens)
107	Backend framework (Node.js/Express, Python/Flask, etc.)
108	Database (PostgreSQL, MongoDB, etc.)
109	Frontend framework (React, Angular, Vue.js)
110	API design
111	Security best practices
112	Node.js (Express)
113	bcrypt (hashing passwords)
114	React/Vue/Angular (for UI)
115	Node.js/Express
116	JWT (JSON Web Tokens)
117	Passport.js (hoặc thư viện tương tự)
118	Database (PostgreSQL, MongoDB, MySQL)
119	React/Angular/Vue.js
120	HTTP Cookies/LocalStorage
121	Authentication (JWT, Refresh Tokens)
122	Backend Framework (Node.js/Express)
123	JSON Web Token (JWT)
124	bcrypt (or similar password hashing library)
125	React (or other frontend framework)
126	TensorFlow/PyTorch
127	Computer Vision (OpenCV)
128	PostgreSQL/MongoDB
129	CI/CD (Gitlab CI/GitHub Actions)
130	Problem Solving
131	TypeScript / JavaScript
132	React Native
133	Node.js (cho backend nếu cần)
134	Testing UI (e.g., Cypress, Selenium, Playwright)
135	Testing API (e.g., Postman, Rest-Assured)
136	JavaScript/TypeScript
137	Database Querying (e.g., SQL)
138	CI/CD basics (e.g., Jenkins, GitLab CI)
139	Kiến thức về quy trình chấm công
140	Kiến thức về các loại máy chấm công
141	Manual Testing
142	API Testing (e.g., Postman)
143	Automation Testing (UI)
144	Automation Testing (API)
145	SQL (basic)
146	Email
147	Máy in
148	Phần mềm văn phòng
149	Node.js (hoặc backend framework tương đương)
150	PostgreSQL (hoặc database tương đương)
151	CI/CD (Gitlab CI, Github Actions)
152	AI/ML
153	UI Design Principles
154	CRUD Principles
155	Understanding of Backend APIs
156	BPMN
157	Use Case
158	Flowcharts
159	Android studio
160	React.js
161	Knex.js / Objection.js
162	Full-stack Integration
163	Socket.io
164	JavaScript (ES6+)
165	Database (e.g., MongoDB, PostgreSQL)
166	Database ORM/ODM (e.g., Mongoose, Sequelize)
167	HTML/CSS
168	UI/UX Principles
169	Git/Version Control
170	Kubernetes (K8s)
171	Linux/Shell Scripting
172	YAML (for K8s manifests)
173	CI/CD Tools (e.g., GitLab CI, GitHub Actions)
174	Cloud Platform (e.g., AWS, GCP, Azure) - for managed K8s
175	User Requirements Analysis
176	BRD Interpretation
177	UX Design
178	Responsive Layout
179	2D Game Design
180	3D Game Design
181	Game Design
182	Test Case Writing
183	Bug Finding
184	Automated Testing
185	API Testing
186	User Stories
187	Workflow Diagrams
188	Frontend Development
189	Backend Development
190	Full-stack Development
191	Admin Dashboard Development
192	API Integration
193	Game Level Design
194	Character Progression Systems Design
195	Visual Concepts
196	Environment Design
197	Character Appearance Design
198	HUD Elements Design
199	UI/UX Bug Fixing
200	App Responsiveness
201	Android Development
202	User Authentication
203	Personalized Meal Plan Features
204	Use Case Diagrams
205	User Experience (UX)
206	Automated UI Testing
207	SDLC Knowledge
208	Korean Language
209	English Language
210	Frontend Development (React)
211	Backend Development (Node.js)
212	UI Development (Android/XML)
213	RESTful API Development
214	User Story Creation
215	Gameplay Testing
216	Performance Optimization
217	Game Art/Aesthetics
218	Responsive Layout Principles
219	Teamwork and Collaboration
220	Flowchart Creation
221	Workflow Diagram Creation
222	Requirements Gathering
223	Debugging
224	Level Design
225	Character Progression Design
226	Game Aesthetics Design
227	User Authentication Development
228	Unity 3D Development
229	C# Programming
230	Game Development Lifecycle
231	Gameplay Programming
232	3D Game Development
233	Artificial Intelligence (AI) for Games
234	Game Design (Concepts & Mechanics)
235	User Interface (UI) Design & Implementation
236	User Experience (UX) Design
237	Graphics Development (3D)
238	Graphics Optimization
239	Character Animation
240	Texture Design (Adobe Photoshop)
241	Software Architecture Design
242	Requirements Analysis
243	Mobile Game Development
244	Cross-platform Development
245	Software Optimization
246	Software Testing & Quality Assurance
247	Project Management (Solo Development)
248	Technical Documentation
249	Save/Load System Development
250	Weapon System Development
251	Logical and Critical Thinking
252	UX Principles
253	API Development
254	UI Testing
255	Authentication
256	Personalized Meal Plans
257	Android App Development
258	GitHub Actions
259	CI/CD Principles
260	Linux/Bash Scripting
261	Cloud Infrastructure (AWS/GCP/Azure/on-premise K8s setup)
262	Networking (TCP/IP, Load Balancing, DNS)
263	Kiểm thử chức năng (Functional Testing)
264	Kiểm thử API (API Testing)
265	Kiểm thử UI/UX (UI/UX Testing)
266	Kiến thức nghiệp vụ (QLNS)
267	Thiết kế & Thực thi Test Case hiệu quả
268	Lập chiến lược & Ưu tiên kiểm thử
269	Báo cáo lỗi & Theo dõi (Bug Reporting & Tracking)
270	Kỹ năng phân tích & Giải quyết vấn đề
271	Analyzing User Requirements
272	Interpreting BRDs
273	User Experience
274	Game UI Design
275	Game Aesthetics
276	Software Development Lifecycle (SDLC) Knowledge
277	Writing Test Cases
278	Quality Assurance
279	Issue Documentation
280	Issue Reporting
281	Retesting
282	Requirements Documentation
283	SDLC (Software Development Life Cycle)
284	Collaboration with Developers
285	Stakeholder Communication
286	Bug Fixing
287	System Functionality Validation
288	Visual Concepts Creation
289	Android UI Development (XML)
290	Android Compatibility
291	User Requirement Analysis
292	Use Case Diagram
293	Flowchart
294	UI Design (Web)
295	UI Design (Mobile Apps)
296	UI Design (2D Games)
297	UI Design (3D Games)
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (task_id, project_id, title, description, status, priority, assignee_id, due_date, estimated_hours, actual_hours, created_at, updated_at, start_date, depends_on, ai_metadata, estimated_days, completed_at, approved_by, approved_at) FROM stdin;
TASK20251113010721956	3	Xây dựng giao diện màn quản lí người dùng	Dùng React nextjjs typécript thư viện antd đẻ xây dựng giao diện quản lí người dùng	done	medium	9	2025-11-14	24	0	2025-11-13 01:07:21.95596+07	2025-12-23 20:55:02.275+07	2025-11-13	\N	{"difficulty_level":4,"estimated_hours":24,"summary":"Với timeline 3 ngày, cần tập trung vào xây dựng giao diện quản lý người dùng đơn giản sử dụng React, Next.js, TypeScript và Ant Design.  Ưu tiên người có kinh nghiệm tốt với các công nghệ front-end và kiến thức cơ bản về backend và database. Infrastructure không cần thiết phải hoàn thiện trong 3 ngày, có thể triển khai sau.","recommendations":["Nếu công việc chưa hoàn thành trong 3 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên người có kinh nghiệm xây dựng CRUD UI với Ant Design để tiết kiệm thời gian.","Sử dụng API endpoint có sẵn hoặc đơn giản hóa logic backend để tập trung vào front-end.","Nếu không đủ thời gian cho CI/CD, hãy tạm thời bỏ qua và tập trung vào chức năng chính."],"required_skills":[{"skill_id":1,"skill_name":"React","required_level":"C","importance":"required"},{"skill_id":2,"skill_name":"Next.js","required_level":"C","importance":"required"},{"skill_id":3,"skill_name":"TypeScript","required_level":"C","importance":"required"},{"skill_id":4,"skill_name":"Ant Design","required_level":"C","importance":"required"},{"skill_id":99,"skill_name":"API Design (RESTful)","required_level":"C","importance":"required"},{"skill_id":100,"skill_name":"Backend Development (Node.js/Express)","required_level":"D","importance":"preferred"},{"skill_id":101,"skill_name":"Database (PostgreSQL/MongoDB)","required_level":"D","importance":"preferred"},{"skill_id":89,"skill_name":"Docker","required_level":"E","importance":"nice-to-have"},{"skill_id":91,"skill_name":"CI/CD","required_level":"E","importance":"nice-to-have"}]}	0	2025-12-23 20:55:02.275+07	3	2025-12-23 20:55:02.275+07
TASK20251223010300113	3	xây dựng màn quản lí KPI của nhân viên	xây dựng màn quản lí KPI của nhân viên cả frontend và backend dung react typécript antd express nodejs knex objectionjs postgréQL	done	high	9	2025-12-26	24	0	2025-12-23 01:03:00.113138+07	2025-12-24 00:25:17.428+07	\N	\N	{"difficulty_level":4,"estimated_hours":24,"summary":"Để xây dựng màn quản lý KPI full-stack (frontend và backend) với React, Node.js, PostgreSQL trong 3 ngày, yêu cầu cá nhân phải có kỹ năng thành thạo (Advanced) ở hầu hết các công nghệ, có kinh nghiệm triển khai dự án tương tự và khả năng làm việc nhanh chóng.","recommendations":["Nếu công việc chưa hoàn thành trong 3 ngày, nhân sự cần chủ động OT để kịp deadline.","Tập trung vào tính năng CRUD cơ bản (MVP) trước, các tính năng nâng cao hơn (filtering, sorting phức tạp, báo cáo) có thể thêm sau.","Đảm bảo môi trường phát triển (DEV setup) đã sẵn sàng và các component/utility cơ bản của dự án đã có sẵn để tái sử dụng.","Người thực hiện cần có khả năng tự giải quyết vấn đề nhanh chóng và đưa ra quyết định kiến trúc hiệu quả để hoàn thành trong thời gian ngắn."],"required_skills":[{"skill_id":160,"skill_name":"React.js","required_level":"C","importance":"required"},{"skill_id":3,"skill_name":"TypeScript","required_level":"C","importance":"required"},{"skill_id":4,"skill_name":"Ant Design","required_level":"C","importance":"required"},{"skill_id":59,"skill_name":"Node.js","required_level":"C","importance":"required"},{"skill_id":76,"skill_name":"Express.js","required_level":"C","importance":"required"},{"skill_id":161,"skill_name":"Knex.js / Objection.js","required_level":"C","importance":"required"},{"skill_id":18,"skill_name":"PostgreSQL","required_level":"D","importance":"required"},{"skill_id":99,"skill_name":"API Design (RESTful)","required_level":"C","importance":"required"},{"skill_id":162,"skill_name":"Full-stack Integration","required_level":"C","importance":"required"}]}	3	2025-12-23 23:28:47.803+07	3	2025-12-24 00:25:17.428+07
TASK20251113015743488	1	Test Task từ API	Đây là task test để kiểm tra API	todo	high	2	2025-11-15	8	0	2025-11-13 01:57:43.488602+07	2025-11-13 01:57:43.488602+07	2025-11-13	\N	\N	1	\N	\N	\N
TASK20251113020120703	3	Xây dựng BE màn quản lí người dùng	Xây dựng BE màn quản li người dùng dùng nodejs typécript knex objection postgreSQL	in_progress	medium	9	2025-11-15	16	0	2025-11-13 02:01:20.702762+07	2025-11-13 02:01:28.865+07	2025-11-13	\N	{"difficulty_level":4,"estimated_hours":16,"summary":"Với timeline 2 ngày để xây dựng BE cho màn quản lý người dùng, cần team có trình độ Advanced (B) với các kỹ năng Node.js, TypeScript, Knex, Objection, và PostgreSQL. Ưu tiên thành viên có kinh nghiệm với Docker và CI/CD để đảm bảo triển khai nhanh chóng.","recommendations":["Nếu công việc chưa hoàn thành trong 2 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên chọn các thành viên có kinh nghiệm thực tế trong việc xây dựng API CRUD với các công nghệ đã liệt kê.","Cân nhắc sử dụng các thư viện hoặc framework hỗ trợ để tăng tốc độ phát triển.","Thiết kế cơ sở dữ liệu và API endpoint cần được thống nhất trước khi bắt đầu code để tránh phát sinh các thay đổi lớn."],"required_skills":[{"skill_id":-1,"skill_name":"Node.js","required_level":"C","importance":"required"},{"skill_id":-1,"skill_name":"TypeScript","required_level":"C","importance":"required"},{"skill_id":-1,"skill_name":"Knex.js","required_level":"C","importance":"required"},{"skill_id":-1,"skill_name":"Objection.js","required_level":"C","importance":"required"},{"skill_id":-1,"skill_name":"PostgreSQL","required_level":"C","importance":"required"},{"skill_id":-1,"skill_name":"Docker","required_level":"C","importance":"preferred"},{"skill_id":-1,"skill_name":"CI/CD","required_level":"C","importance":"preferred"}]}	2	\N	\N	\N
TASK20251113010535784	5	Integrate OAuth2	Integrate OAuth2 login flow	todo	medium	1	2025-11-27	16	0	2025-11-13 01:05:34.396975+07	2025-11-13 01:05:34.396975+07	2025-11-20	\N	{"difficulty_level":2,"estimated_hours":16,"notes":"Estimated by AI"}	0	\N	\N	\N
TASK20251113140944615	3	Test màn chấm công	Dùng công cụ test màn chấm công	done	urgent	12	2025-11-14	8	0	2025-11-13 14:09:44.615133+07	2025-12-23 19:13:44.55+07	\N	\N	{"difficulty_level":3,"estimated_hours":8,"summary":"Với timeline 1 ngày, cần Tester có kinh nghiệm test UI đơn giản và API endpoint đơn giản. Ưu tiên kỹ năng Manual Testing tốt và kinh nghiệm với các hệ thống chấm công.  Automation Testing chỉ là tùy chọn nếu còn thời gian.","recommendations":["Nếu công việc chưa hoàn thành trong 1 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên tester có kinh nghiệm test hệ thống chấm công trước đây.","Chuẩn bị sẵn test case (UI, API) để tối ưu thời gian.","Tập trung vào chức năng chính của màn hình chấm công trước, automation testing có thể để dành cho sau."],"required_skills":[{"skill_id":139,"skill_name":"Kiến thức về quy trình chấm công","required_level":"D","importance":"required"},{"skill_id":140,"skill_name":"Kiến thức về các loại máy chấm công","required_level":"D","importance":"required"},{"skill_id":141,"skill_name":"Manual Testing","required_level":"C","importance":"required"},{"skill_id":142,"skill_name":"API Testing (e.g., Postman)","required_level":"D","importance":"preferred"},{"skill_id":143,"skill_name":"Automation Testing (UI)","required_level":"E","importance":"nice-to-have"},{"skill_id":144,"skill_name":"Automation Testing (API)","required_level":"E","importance":"nice-to-have"},{"skill_id":145,"skill_name":"SQL (basic)","required_level":"E","importance":"nice-to-have"}]}	1	\N	\N	\N
TASK20251113022200645	1	Test Task từ API	Đây là task test để kiểm tra API	todo	high	2	2025-11-15	8	0	2025-11-13 02:22:00.645839+07	2025-11-13 02:22:00.645839+07	2025-11-13	\N	\N	1	\N	\N	\N
TASK20251113025410834	3	Test Quick Script	Testing start_date functionality	todo	medium	25	2025-12-05	24	0	2025-11-13 02:54:07.433681+07	2025-11-13 02:54:07.433681+07	2025-12-01	\N	\N	3	\N	\N	\N
TASK20251113025411152	3	Test No Start Date	Should have null start_date	done	medium	29	2025-11-14	8	0	2025-11-13 02:54:11.152283+07	2025-12-22 16:42:17.631+07	\N	\N	\N	1	2025-12-22 15:39:27.182+07	\N	\N
TASK20251113021405320	3	Xây dung màn chấm công	Xây dựng giao diện màn chấm công dung react typécript antd nextjs	done	medium	9	2025-11-14	8	0	2025-11-13 02:14:05.320103+07	2025-12-23 19:22:41.229+07	2025-11-13	\N	{"difficulty_level":4,"estimated_hours":8,"summary":"Với timeline 1 ngày, yêu cầu developer có kinh nghiệm React/Typescript (cấp độ chuyên gia) và kinh nghiệm với Ant Design, Next.js (cấp độ cao) để xây dựng giao diện và API endpoint cơ bản. Ưu tiên người có kinh nghiệm Docker để đơn giản hóa việc triển khai.","recommendations":["Nếu công việc chưa hoàn thành trong 1 ngày, nhân sự cần chủ động OT để kịp deadline.","Chia nhỏ task, tập trung vào chức năng CRUD cơ bản trước, các tính năng mở rộng có thể triển khai sau.","Sử dụng các component Ant Design có sẵn để tiết kiệm thời gian xây dựng giao diện.","Nếu có thể, sử dụng API backend có sẵn hoặc mock API để tập trung vào phần frontend."],"required_skills":[{"skill_id":1,"skill_name":"React","required_level":"B","importance":"required"},{"skill_id":3,"skill_name":"TypeScript","required_level":"B","importance":"required"},{"skill_id":95,"skill_name":"Ant Design (Antd)","required_level":"C","importance":"required"},{"skill_id":2,"skill_name":"Next.js","required_level":"C","importance":"required"},{"skill_id":5,"skill_name":"REST API","required_level":"C","importance":"required"},{"skill_id":89,"skill_name":"Docker","required_level":"D","importance":"preferred"},{"skill_id":91,"skill_name":"CI/CD","required_level":"D","importance":"nice-to-have"}]}	1	2025-12-23 19:22:41.229+07	3	2025-12-23 19:22:41.229+07
TASK20251113034304081	3	xây dựng giao diện quả lí người dùng app	dùng react native typécript	done	medium	12	2025-11-17	32	0	2025-11-13 03:43:04.08151+07	2025-12-24 00:25:13.86+07	\N	\N	{"difficulty_level":4,"estimated_hours":32,"summary":"Với timeline 4 ngày, yêu cầu developer có kỹ năng React Native và TypeScript ở mức Advanced để xây dựng giao diện quản lý người dùng cơ bản với các chức năng CRUD. Ưu tiên các developer có kinh nghiệm làm việc với REST API.","recommendations":["Nếu công việc chưa hoàn thành trong 4 ngày, nhân sự cần chủ động OT để kịp deadline.","Tập trung vào việc xây dựng các chức năng CRUD cơ bản và hoàn thiện giao diện người dùng thay vì cố gắng tích hợp các tính năng phức tạp.","Sử dụng các thư viện UI component có sẵn để tiết kiệm thời gian phát triển.","Nếu có thể, sử dụng backend API đã có sẵn hoặc đơn giản hóa logic backend để phù hợp với thời gian giới hạn."],"required_skills":[{"skill_id":132,"skill_name":"React Native","required_level":"C","importance":"required"},{"skill_id":3,"skill_name":"TypeScript","required_level":"C","importance":"required"},{"skill_id":5,"skill_name":"REST API","required_level":"C","importance":"required"},{"skill_id":98,"skill_name":"CRUD Operations","required_level":"C","importance":"required"},{"skill_id":6,"skill_name":"Git","required_level":"D","importance":"required"},{"skill_id":133,"skill_name":"Node.js (cho backend nếu cần)","required_level":"D","importance":"preferred"},{"skill_id":89,"skill_name":"Docker","required_level":"D","importance":"nice-to-have"}]}	4	2025-12-23 23:40:36.965+07	3	2025-12-24 00:25:13.86+07
TASK20251113031451125	3	Test Auto Calculation	Test estimated_days auto-calculation	todo	high	29	2025-12-05	8	0	2025-11-13 03:14:51.125492+07	2025-11-13 03:14:51.125492+07	2025-12-01	\N	\N	1	\N	\N	\N
TASK20251113034729870	3	test màn chấm công	dung công cụ test màn chấm công	todo	medium	25	2025-11-14	8	0	2025-11-13 03:47:29.870066+07	2025-11-13 03:47:29.870066+07	\N	\N	{"difficulty_level":3,"estimated_hours":8,"summary":"Phân tích tự động (AI tạm thời không khả dụng). Công việc \\"test màn chấm công\\" được ước tính 1 ngày (8h).","recommendations":["Phân tích heuristic: công việc ước tính 1 ngày (8h).","AI tạm unavailable — kiểm tra và điều chỉnh thời gian/kỹ năng nếu cần."],"required_skills":[{"skill_id":130,"skill_name":"Problem Solving","required_level":"C","importance":"required"},{"skill_id":131,"skill_name":"TypeScript / JavaScript","required_level":"C","importance":"preferred"}]}	1	\N	\N	\N
TASK20251113023129402	3	Xây dựng BE nhận chấm công	Xây dựng BE chấm công bằng nodejs express knex objection postgreSQL	done	medium	25	2025-11-15	16	0	2025-11-13 02:31:29.400993+07	2026-01-07 22:30:50.082+07	2025-11-13	\N	{"difficulty_level":4,"estimated_hours":16,"summary":"Với timeline 2 ngày, yêu cầu kỹ năng ở mức Advanced (B) cho các công nghệ chính như Node.js, Express, Knex, Objection và PostgreSQL để xây dựng Backend chấm công. Việc triển khai Docker và CI/CD là tùy chọn, nếu có thể thì sẽ giúp ích.","recommendations":["Nếu công việc chưa hoàn thành trong 2 ngày, nhân sự cần chủ động OT để kịp deadline.","Tập trung vào việc xây dựng các API endpoint CRUD cơ bản cho chấm công. Ưu tiên hoàn thành chức năng cốt lõi trước.","Sử dụng các thư viện và package có sẵn để tăng tốc độ phát triển.","Nếu có thể, tham khảo các dự án tương tự hoặc template có sẵn để tiết kiệm thời gian."],"required_skills":[{"skill_id":59,"skill_name":"Node.js","required_level":"C","importance":"required"},{"skill_id":76,"skill_name":"Express.js","required_level":"C","importance":"required"},{"skill_id":77,"skill_name":"Knex.js","required_level":"C","importance":"required"},{"skill_id":85,"skill_name":"Objection.js","required_level":"C","importance":"required"},{"skill_id":18,"skill_name":"PostgreSQL","required_level":"C","importance":"required"},{"skill_id":89,"skill_name":"Docker","required_level":"D","importance":"preferred"},{"skill_id":91,"skill_name":"CI/CD","required_level":"D","importance":"nice-to-have"},{"skill_id":93,"skill_name":"RESTful API Design","required_level":"C","importance":"required"}]}	2	2026-01-07 22:30:15.869+07	3	2026-01-07 22:30:50.082+07
TASK20251118160335000	3	gioa diện màn công việc	giao diện màn công việc	done	high	9	2025-11-21	24	0	2025-11-18 16:03:35.000794+07	2025-12-23 20:55:04.438+07	\N	\N	{"difficulty_level":3,"estimated_hours":24,"summary":"Để hoàn thành giao diện màn công việc (CRUD đơn giản và API) trong 3 ngày, yêu cầu kỹ năng React, Node.js (hoặc framework backend khác) và Database ở mức độ Advanced (B). Docker và CI/CD mức Intermediate (C) sẽ giúp đẩy nhanh quá trình triển khai.","recommendations":["Nếu công việc chưa hoàn thành trong 3 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên các framework và thư viện UI có sẵn để tăng tốc độ phát triển.","Sử dụng các công cụ scaffolding hoặc boilerplate để tạo nhanh các component và API endpoints.","Nếu có thể, hãy đơn giản hóa các yêu cầu về tích hợp AI/ML hoặc loại bỏ hoàn toàn nếu không thực sự cần thiết trong giai đoạn này."],"required_skills":[{"skill_id":1,"skill_name":"React","required_level":"C","importance":"required"},{"skill_id":149,"skill_name":"Node.js (hoặc backend framework tương đương)","required_level":"C","importance":"required"},{"skill_id":150,"skill_name":"PostgreSQL (hoặc database tương đương)","required_level":"C","importance":"required"},{"skill_id":89,"skill_name":"Docker","required_level":"D","importance":"preferred"},{"skill_id":151,"skill_name":"CI/CD (Gitlab CI, Github Actions)","required_level":"D","importance":"nice-to-have"}]}	3	2025-12-23 20:55:04.438+07	3	2025-12-23 20:55:04.439+07
TASK20260109160057976	3	Xây dụng phần thông báo	Xây dựng phần thông báo bằng socket.io	pending_approval	urgent	12	2026-01-12	24	0	2026-01-09 16:00:57.97607+07	2026-01-09 18:33:25.517+07	\N	\N	{"difficulty_level":4,"estimated_hours":24,"summary":"Trong 3 ngày, cần xây dựng hệ thống thông báo thời gian thực sử dụng Socket.io, bao gồm cả phần backend (Node.js, Express, DB) để gửi/lưu trữ và frontend (React) để hiển thị/quản lý thông báo. Yêu cầu kỹ năng cao về Socket.io, Node.js và framework frontend để hoàn thành trong thời gian ngắn.","recommendations":["Nếu công việc chưa hoàn thành trong 3 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên chức năng cốt lõi: chỉ tập trung vào việc gửi thông báo real-time, lưu trữ cơ bản và hiển thị danh sách thông báo đơn giản (ví dụ: đánh dấu đã đọc). Các tính năng phức tạp hơn như phân loại, tùy chỉnh, lọc nên được xem xét ở giai đoạn sau.","Tận dụng tối đa các thư viện, cấu trúc dự án và các thành phần UI/API đã có sẵn trong dự án QLNS để tiết kiệm thời gian phát triển và tích hợp.","Thực hiện kiểm thử kỹ lưỡng các luồng thông báo (kết nối, gửi, nhận, đồng bộ trạng thái) để đảm bảo tính ổn định và tin cậy của hệ thống real-time."],"required_skills":[{"skill_id":59,"skill_name":"Node.js","required_level":"C","importance":"required"},{"skill_id":163,"skill_name":"Socket.io","required_level":"B","importance":"required"},{"skill_id":1,"skill_name":"React","required_level":"C","importance":"required"},{"skill_id":164,"skill_name":"JavaScript (ES6+)","required_level":"C","importance":"required"},{"skill_id":76,"skill_name":"Express.js","required_level":"D","importance":"required"},{"skill_id":165,"skill_name":"Database (e.g., MongoDB, PostgreSQL)","required_level":"D","importance":"required"},{"skill_id":166,"skill_name":"Database ORM/ODM (e.g., Mongoose, Sequelize)","required_level":"D","importance":"preferred"},{"skill_id":167,"skill_name":"HTML/CSS","required_level":"D","importance":"required"},{"skill_id":93,"skill_name":"RESTful API Design","required_level":"D","importance":"required"},{"skill_id":6,"skill_name":"Git","required_level":"D","importance":"required"}]}	3	2026-01-09 18:33:25.517+07	\N	\N
TASK20260118023912047	3	devOPs	thwục hiện devOP bằng docker và k8s tích hợp cicd từ githubaction và cluôndamqp\n	done	high	18	2026-01-22	32	0	2026-01-18 02:39:12.047247+07	2026-01-18 02:43:54.283+07	\N	\N	{"difficulty_level":4,"estimated_hours":32,"summary":"Để thực hiện triển khai DevOps với Docker, Kubernetes và CI/CD bằng GitHub Actions trong 4 ngày, cần một kỹ sư DevOps có trình độ chuyên môn cao (Advanced đến Expert) với kinh nghiệm thực tế về cả ba công nghệ để đảm bảo triển khai nhanh và hiệu quả.","recommendations":["Nếu công việc chưa hoàn thành trong 4 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên sử dụng Managed Kubernetes Service (như EKS, GKE, AKS) để tiết kiệm thời gian thiết lập và quản lý hạ tầng cơ bản.","Chuẩn bị sẵn một ứng dụng mẫu (ví dụ: một ứng dụng 'Hello World' đơn giản) để kiểm tra và chứng minh pipeline CI/CD hoạt động thay vì phải phát triển ứng dụng từ đầu.","Tập trung vào một luồng CI/CD cơ bản nhất (build, push image, deploy) trước khi mở rộng các tính năng phức tạp hơn để đảm bảo hoàn thành mục tiêu trong 4 ngày."],"required_skills":[{"skill_id":89,"skill_name":"Docker","required_level":"C","importance":"required"},{"skill_id":170,"skill_name":"Kubernetes (K8s)","required_level":"B","importance":"required"},{"skill_id":258,"skill_name":"GitHub Actions","required_level":"C","importance":"required"},{"skill_id":259,"skill_name":"CI/CD Principles","required_level":"C","importance":"required"},{"skill_id":260,"skill_name":"Linux/Bash Scripting","required_level":"D","importance":"required"},{"skill_id":261,"skill_name":"Cloud Infrastructure (AWS/GCP/Azure/on-premise K8s setup)","required_level":"D","importance":"required"},{"skill_id":262,"skill_name":"Networking (TCP/IP, Load Balancing, DNS)","required_level":"D","importance":"preferred"},{"skill_id":6,"skill_name":"Git","required_level":"C","importance":"required"}]}	4	2026-01-18 02:43:24.271+07	3	2026-01-18 02:43:54.284+07
TASK20260109183614971	3	sửa lại giao diện màn đăng nhập hiện đại hơn	dung react TS và thư viện antd	todo	low	9	2026-01-10	8	0	2026-01-09 18:36:14.970732+07	2026-01-09 18:36:14.970732+07	\N	\N	{"difficulty_level":2,"estimated_hours":8,"summary":"Nâng cấp giao diện màn hình đăng nhập hiện đại hơn bằng React, TypeScript và Ant Design trong 1 ngày, đòi hỏi kỹ năng frontend nâng cao để đảm bảo chất lượng và tốc độ triển khai.","recommendations":["Nếu công việc chưa hoàn thành trong 1 ngày, nhân sự cần chủ động OT để kịp deadline.","Chọn một Developer có kinh nghiệm thực tế về React, TypeScript và Ant Design, ưu tiên những người đã từng tham gia các dự án revamp UI tương tự để có thể triển khai nhanh chóng.","Cung cấp rõ ràng các wireframe hoặc mockup chi tiết về giao diện 'hiện đại hơn' mong muốn để giảm thiểu thời gian điều chỉnh và hiểu sai yêu cầu.","Đảm bảo môi trường phát triển (bao gồm project setup, dependencies) đã sẵn sàng để developer có thể bắt đầu công việc code ngay lập tức mà không tốn thời gian cài đặt."],"required_skills":[{"skill_id":160,"skill_name":"React.js","required_level":"C","importance":"required"},{"skill_id":3,"skill_name":"TypeScript","required_level":"C","importance":"required"},{"skill_id":4,"skill_name":"Ant Design","required_level":"C","importance":"required"},{"skill_id":167,"skill_name":"HTML/CSS","required_level":"D","importance":"required"},{"skill_id":168,"skill_name":"UI/UX Principles","required_level":"C","importance":"preferred"},{"skill_id":169,"skill_name":"Git/Version Control","required_level":"D","importance":"required"}]}	1	\N	\N	\N
TASK20260123190439141	3	kiểm thử	test toàn bộ hệ thông xem còn lỗi nào không	todo	high	9	2026-02-03	88	0	2026-01-24 02:04:39.141202+07	2026-01-24 02:04:39.141202+07	\N	\N	{"difficulty_level":4,"estimated_hours":88,"summary":"Kiểm thử toàn bộ hệ thống QLNS trong 11 ngày là một thách thức lớn, đòi hỏi nhân sự kiểm thử cấp độ chuyên gia (A/B) với khả năng phân tích, ưu tiên và thực thi kiểm thử cực kỳ hiệu quả, tập trung vào các chức năng cốt lõi và rủi ro cao.","recommendations":["Nếu công việc chưa hoàn thành trong 11 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên các tính năng cốt lõi, luồng nghiệp vụ chính và các module rủi ro cao để tối đa hóa hiệu quả kiểm thử trong thời gian giới hạn 11 ngày.","Cân nhắc một đội nhóm nhỏ (2-3 người) gồm các kiểm thử viên cấp độ A/B thay vì một cá nhân để có thể bao quát phạm vi 'toàn bộ hệ thống' một cách hợp lý hơn.","Làm rõ phạm vi và mức độ kiểm thử chi tiết (ví dụ: chỉ kiểm thử chức năng, hay bao gồm cả regression, tích hợp cơ bản...) và tận dụng tối đa mọi tài nguyên có sẵn như test case, tài liệu nghiệp vụ, hoặc công cụ kiểm thử tự động."],"required_skills":[{"skill_id":263,"skill_name":"Kiểm thử chức năng (Functional Testing)","required_level":"B","importance":"required"},{"skill_id":264,"skill_name":"Kiểm thử API (API Testing)","required_level":"C","importance":"required"},{"skill_id":265,"skill_name":"Kiểm thử UI/UX (UI/UX Testing)","required_level":"C","importance":"required"},{"skill_id":266,"skill_name":"Kiến thức nghiệp vụ (QLNS)","required_level":"C","importance":"required"},{"skill_id":267,"skill_name":"Thiết kế & Thực thi Test Case hiệu quả","required_level":"B","importance":"required"},{"skill_id":268,"skill_name":"Lập chiến lược & Ưu tiên kiểm thử","required_level":"B","importance":"required"},{"skill_id":269,"skill_name":"Báo cáo lỗi & Theo dõi (Bug Reporting & Tracking)","required_level":"C","importance":"required"},{"skill_id":270,"skill_name":"Kỹ năng phân tích & Giải quyết vấn đề","required_level":"C","importance":"required"}]}	11	\N	\N	\N
TASK20260111230500792	3	triển khai ứng dụng	triển khai ứng dụng với docker và k8s	done	high	18	2026-01-13	16	0	2026-01-11 23:05:00.79228+07	2026-01-24 02:04:45.257+07	\N	\N	{"difficulty_level":4,"estimated_hours":16,"summary":"Triển khai ứng dụng với Docker và Kubernetes trong 2 ngày là một nhiệm vụ đòi hỏi kỹ năng nâng cao về container hóa, orchestration với K8s và kiến thức về hạ tầng. Thời gian hạn chế yêu cầu người có kinh nghiệm vững vàng để đảm bảo hoàn thành.","recommendations":["Nếu công việc chưa hoàn thành trong 2 ngày, nhân sự cần chủ động OT để kịp deadline.","Ưu tiên ứng viên có kinh nghiệm thực tế triển khai ứng dụng lên Kubernetes trong các dự án trước đó để đảm bảo hiệu suất.","Đảm bảo ứng dụng cần triển khai đã được đóng gói Docker (Dockerized) sẵn sàng, tránh mất thời gian cho việc container hóa ban đầu.","Chuẩn bị sẵn môi trường K8s (cluster đã provision hoặc dễ dàng truy cập) để không phải dành thời gian cài đặt hạ tầng cluster từ đầu."],"required_skills":[{"skill_id":89,"skill_name":"Docker","required_level":"C","importance":"required"},{"skill_id":170,"skill_name":"Kubernetes (K8s)","required_level":"C","importance":"required"},{"skill_id":171,"skill_name":"Linux/Shell Scripting","required_level":"D","importance":"required"},{"skill_id":172,"skill_name":"YAML (for K8s manifests)","required_level":"D","importance":"required"},{"skill_id":173,"skill_name":"CI/CD Tools (e.g., GitLab CI, GitHub Actions)","required_level":"D","importance":"preferred"},{"skill_id":174,"skill_name":"Cloud Platform (e.g., AWS, GCP, Azure) - for managed K8s","required_level":"D","importance":"preferred"}]}	2	2026-01-11 23:07:19.642+07	3	2026-01-24 02:04:45.257+07
\.


--
-- Data for Name: user_kpi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_kpi (kpi_id, user_id, project_id, task_id, month, year, completion_status, delay_days, completed_at, due_date, approved_at, approved_by, created_at) FROM stdin;
1	9	3	TASK20251113021405320	12	2025	late	40	2025-12-23 19:22:41.229+07	2025-11-14 00:00:00+07	2025-12-23 19:22:41.275+07	3	2025-12-23 19:22:41.283281+07
2	9	3	TASK20251113010721956	12	2025	late	40	2025-12-23 20:55:02.275+07	2025-11-14 00:00:00+07	2025-12-23 20:55:02.317+07	3	2025-12-23 20:55:02.325503+07
3	9	3	TASK20251118160335000	12	2025	late	33	2025-12-23 20:55:04.438+07	2025-11-21 00:00:00+07	2025-12-23 20:55:04.452+07	3	2025-12-23 20:55:04.455232+07
4	12	3	TASK20251113034304081	12	2025	late	37	2025-12-23 23:40:36.965+07	2025-11-17 00:00:00+07	2025-12-24 00:25:13.913+07	3	2025-12-24 00:25:13.923445+07
5	9	3	TASK20251223010300113	12	2025	early	-2	2025-12-23 23:28:47.803+07	2025-12-26 00:00:00+07	2025-12-24 00:25:17.443+07	3	2025-12-24 00:25:17.44686+07
6	25	3	TASK20251113023129402	1	2026	late	54	2026-01-07 22:30:15.869+07	2025-11-15 00:00:00+07	2026-01-07 22:30:50.1+07	3	2026-01-07 22:30:50.109345+07
7	18	3	TASK20260118023912047	1	2026	early	-4	2026-01-18 02:43:24.271+07	2026-01-22 00:00:00+07	2026-01-18 02:43:54.302+07	3	2026-01-18 02:43:54.310591+07
8	18	3	TASK20260111230500792	1	2026	early	-1	2026-01-11 23:07:19.642+07	2026-01-13 07:00:00+07	2026-01-24 02:04:45.292+07	3	2026-01-24 02:04:45.304566+07
\.


--
-- Data for Name: user_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_skills (user_id, skill_id, proficiency_level) FROM stdin;
9	8	B
9	9	B
9	3	B
9	10	B
9	11	B
9	12	B
9	13	B
9	14	B
9	15	B
9	16	B
9	17	B
9	18	B
9	19	B
9	20	B
9	21	B
9	22	B
9	23	B
9	24	B
9	25	B
9	26	B
9	27	B
9	28	B
9	29	B
9	30	B
9	31	B
9	32	B
9	33	B
12	9	B
12	3	C
12	10	B
12	12	B
12	13	C
12	34	C
12	35	C
12	36	C
12	37	B
12	38	C
12	39	C
12	40	C
12	41	B
12	42	C
12	43	C
12	27	C
12	44	C
12	45	C
12	46	C
12	47	B
18	48	B
18	49	B
18	50	C
18	51	B
18	52	B
18	53	B
18	54	B
25	8	B
25	9	B
25	3	B
25	10	B
25	11	B
25	12	C
25	13	C
25	14	C
25	15	C
25	16	C
25	17	C
25	18	C
25	55	C
25	56	B
25	21	B
25	22	C
25	23	C
25	24	C
25	25	C
25	26	C
25	27	C
25	28	B
25	29	B
25	57	B
25	58	B
25	31	B
25	32	B
25	33	B
25	1	C
25	59	C
25	60	C
25	61	C
25	62	C
25	63	C
29	9	B
29	3	C
29	10	B
29	12	B
29	13	B
29	34	C
29	35	C
29	37	B
29	64	B
29	65	B
29	66	B
29	67	B
29	41	B
29	42	B
29	43	B
29	27	B
29	44	B
21	48	B
21	49	B
21	50	C
21	51	B
21	68	B
21	69	B
21	70	B
21	54	B
21	71	B
21	72	C
21	73	C
21	74	C
21	75	C
27	48	B
27	49	B
27	50	C
27	51	B
27	52	B
27	70	B
27	54	B
27	71	B
27	146	B
27	147	B
27	148	B
27	72	C
27	73	C
27	74	C
27	75	C
104	156	B
104	157	B
104	158	B
104	159	C
104	55	C
104	56	B
104	57	B
104	58	B
104	31	B
104	32	B
104	33	B
113	157	A
113	177	A
104	8	B
104	9	B
104	3	A
104	10	B
104	11	B
104	12	B
104	13	B
104	15	B
104	16	B
104	17	C
104	18	B
104	21	B
104	22	B
104	23	B
104	24	C
104	25	C
104	26	C
113	179	A
113	180	A
113	184	A
113	61	A
113	186	A
113	187	A
113	191	A
113	192	A
113	193	A
113	194	A
113	195	A
113	196	A
113	197	A
113	198	A
113	199	A
113	200	A
113	201	A
113	203	A
113	175	A
113	158	A
113	26	B
113	178	A
113	27	B
104	28	A
104	29	A
113	185	B
113	206	B
113	207	A
113	208	A
113	209	A
113	30	A
113	58	A
113	31	A
113	32	A
113	33	A
113	190	A
113	210	A
104	30	A
113	212	A
104	251	A
113	215	A
113	202	A
113	211	A
113	213	A
104	219	A
95	8	B
113	217	A
95	156	B
95	157	B
95	158	B
95	9	A
95	3	B
95	10	B
95	11	C
95	12	B
95	13	C
95	14	B
95	15	B
95	16	B
95	17	C
95	18	B
113	205	B
95	19	B
95	20	B
95	252	B
95	178	B
95	21	B
95	182	B
95	183	B
113	28	A
113	29	A
95	22	B
95	23	B
95	24	C
113	219	B
95	25	B
113	188	B
113	189	B
113	1	B
113	59	B
113	76	B
95	26	C
113	62	B
113	4	B
113	8	A
113	176	A
113	156	A
113	204	A
113	220	A
113	9	A
113	3	A
113	10	B
113	11	A
113	12	B
113	13	A
113	14	A
113	15	A
113	16	A
113	17	B
113	18	A
113	19	A
113	63	A
113	20	A
113	218	A
113	21	A
113	182	A
113	183	A
113	22	A
113	23	A
113	24	B
113	25	A
113	214	A
113	221	A
113	222	A
113	223	A
113	216	A
113	181	A
113	224	A
113	225	A
113	226	A
113	78	A
113	141	A
113	227	A
104	228	A
104	229	A
104	230	A
104	231	A
104	232	A
104	233	B
104	234	B
104	235	B
104	236	B
104	237	B
104	238	B
104	239	B
104	240	B
104	241	B
104	242	B
104	243	B
104	244	B
104	245	B
104	246	B
104	130	B
104	247	B
104	248	B
104	249	B
104	250	B
104	14	B
104	19	B
104	20	B
104	27	C
95	27	C
95	28	A
95	29	A
95	30	B
95	58	B
95	31	B
95	32	B
95	33	B
95	1	B
95	59	B
95	63	B
95	62	B
95	76	B
95	253	B
95	188	B
95	189	B
95	186	B
95	187	B
95	185	B
95	254	B
95	78	B
95	216	B
95	201	B
95	181	B
95	215	B
95	255	B
95	256	B
93	8	A
93	156	A
93	157	A
93	158	A
93	9	A
93	3	A
93	10	A
93	11	B
93	12	A
93	13	B
93	14	A
93	15	A
93	16	A
93	17	B
93	18	A
93	19	A
93	20	A
93	177	A
93	178	A
93	21	A
93	182	A
93	183	A
93	22	A
93	23	B
93	24	B
93	25	B
93	26	B
93	27	B
93	28	A
93	29	A
93	57	A
93	58	A
93	31	A
93	32	A
93	33	A
93	1	A
93	59	A
93	181	A
93	62	B
93	257	A
93	63	A
93	4	A
93	76	A
93	61	A
128	271	B
128	272	B
128	204	B
128	273	B
128	225	B
128	274	B
128	195	B
128	275	B
128	276	B
128	277	B
128	278	B
128	279	B
128	280	B
128	281	B
128	282	B
128	242	B
128	28	A
128	29	A
128	251	B
128	210	B
128	211	B
128	8	A
128	175	A
128	176	A
128	156	B
128	157	B
128	158	B
128	9	B
128	3	B
128	10	B
128	11	C
128	12	C
128	13	C
128	14	B
128	15	A
128	16	A
128	17	C
128	18	B
128	19	B
128	63	B
128	20	B
128	177	B
128	178	B
128	179	B
128	180	B
128	21	A
128	283	B
128	182	B
128	183	B
128	284	B
128	206	A
128	185	A
128	141	B
128	78	B
128	215	B
128	22	B
128	23	C
128	24	B
128	25	B
128	26	B
128	27	C
128	208	A
128	209	B
128	30	A
128	58	B
128	31	B
128	32	A
128	33	A
128	222	A
128	285	B
128	190	A
128	188	A
128	189	A
128	1	A
128	59	A
128	76	B
128	4	B
128	191	B
128	61	B
128	202	B
128	256	B
128	286	B
128	216	B
128	287	B
128	186	B
128	187	B
128	193	B
128	194	B
128	288	B
128	196	B
128	197	B
128	198	B
128	289	B
128	200	B
128	290	B
124	291	A
124	176	A
124	156	A
124	292	A
124	293	A
124	9	B
124	3	A
124	10	B
124	11	A
124	12	B
124	13	B
124	14	B
124	15	A
124	16	A
124	17	B
124	18	A
124	19	A
124	294	A
124	295	A
124	296	A
124	297	A
124	205	A
124	178	A
124	21	A
124	182	A
124	183	A
124	22	A
124	23	B
124	24	B
124	25	A
124	26	B
124	27	C
124	28	A
124	29	A
124	57	A
124	58	A
124	31	A
124	32	A
124	33	A
124	1	A
124	59	A
124	76	A
124	63	B
124	185	A
124	188	A
124	189	A
124	190	A
124	62	B
124	78	A
124	141	A
124	215	A
124	186	A
124	187	A
124	285	A
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 42, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: projects_project_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_project_id_seq', 7, true);


--
-- Name: skills_skill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.skills_skill_id_seq', 323, true);


--
-- Name: user_kpi_kpi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_kpi_kpi_id_seq', 8, true);


--
-- Name: cvs cvs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT cvs_pkey PRIMARY KEY (cv_id);


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
-- Name: project_expenses project_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_expenses
    ADD CONSTRAINT project_expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: project_timeline project_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_timeline
    ADD CONSTRAINT project_timeline_pkey PRIMARY KEY (event_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (skill_id);


--
-- Name: skills skills_skill_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_skill_name_unique UNIQUE (skill_name);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (task_id);


--
-- Name: user_kpi uq_user_kpi_task; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kpi
    ADD CONSTRAINT uq_user_kpi_task UNIQUE (task_id);


--
-- Name: user_kpi user_kpi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kpi
    ADD CONSTRAINT user_kpi_pkey PRIMARY KEY (kpi_id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (user_id, skill_id);


--
-- Name: cvs_user_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cvs_user_id_index ON public.cvs USING btree (user_id);


--
-- Name: idx_tasks_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_start_date ON public.tasks USING btree (start_date);


--
-- Name: idx_user_kpi_full; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_kpi_full ON public.user_kpi USING btree (user_id, project_id, month, year);


--
-- Name: idx_user_kpi_project_month_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_kpi_project_month_year ON public.user_kpi USING btree (project_id, month, year);


--
-- Name: idx_user_kpi_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_kpi_status ON public.user_kpi USING btree (completion_status);


--
-- Name: idx_user_kpi_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_kpi_task ON public.user_kpi USING btree (task_id);


--
-- Name: idx_user_kpi_user_month_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_kpi_user_month_year ON public.user_kpi USING btree (user_id, month, year);


--
-- Name: project_expenses_category_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_expenses_category_index ON public.project_expenses USING btree (category);


--
-- Name: project_expenses_created_by_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_expenses_created_by_index ON public.project_expenses USING btree (created_by);


--
-- Name: project_expenses_expense_date_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_expenses_expense_date_index ON public.project_expenses USING btree (expense_date);


--
-- Name: project_expenses_project_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_expenses_project_id_index ON public.project_expenses USING btree (project_id);


--
-- Name: project_expenses_status_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_expenses_status_index ON public.project_expenses USING btree (status);


--
-- Name: project_members_user_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_members_user_id_index ON public.project_members USING btree (user_id);


--
-- Name: project_timeline_event_time_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_timeline_event_time_index ON public.project_timeline USING btree (event_time);


--
-- Name: project_timeline_event_type_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_timeline_event_type_index ON public.project_timeline USING btree (event_type);


--
-- Name: project_timeline_project_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_timeline_project_id_index ON public.project_timeline USING btree (project_id);


--
-- Name: project_timeline_user_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_timeline_user_id_index ON public.project_timeline USING btree (user_id);


--
-- Name: projects_end_date_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_end_date_index ON public.projects USING btree (end_date);


--
-- Name: projects_manager_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_manager_id_index ON public.projects USING btree (manager_id);


--
-- Name: projects_start_date_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_start_date_index ON public.projects USING btree (start_date);


--
-- Name: projects_status_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_status_index ON public.projects USING btree (status);


--
-- Name: tasks_assignee_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_assignee_id_index ON public.tasks USING btree (assignee_id);


--
-- Name: tasks_completed_at_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_completed_at_index ON public.tasks USING btree (completed_at);


--
-- Name: tasks_due_date_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_due_date_index ON public.tasks USING btree (due_date);


--
-- Name: tasks_priority_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_priority_index ON public.tasks USING btree (priority);


--
-- Name: tasks_project_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_project_id_index ON public.tasks USING btree (project_id);


--
-- Name: tasks_start_date_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_start_date_index ON public.tasks USING btree (start_date);


--
-- Name: tasks_status_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_status_index ON public.tasks USING btree (status);


--
-- Name: project_expenses project_expenses_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_expenses
    ADD CONSTRAINT project_expenses_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: project_timeline project_timeline_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_timeline
    ADD CONSTRAINT project_timeline_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_foreign FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_skill_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_skill_id_foreign FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Mwk8icYkraiZLumCF4fMSB2wS53c8U2IKRMZPmedfQL1hghTQIZ6g1Sqkli33of

