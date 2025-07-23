--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: fuji_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = (NOW() AT TIME ZONE 'Asia/Tokyo');
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO fuji_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: fuji_user
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'Asia/Tokyo'::text),
    last_login timestamp with time zone,
    failed_login_count integer DEFAULT 0,
    locked_until timestamp with time zone
);


ALTER TABLE public.admins OWNER TO fuji_user;

--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: fuji_user
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admins_id_seq OWNER TO fuji_user;

--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fuji_user
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: events_cache; Type: TABLE; Schema: public; Owner: fuji_user
--

CREATE TABLE public.events_cache (
    cache_key character varying(255) NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    day integer,
    location_id integer NOT NULL,
    events_data text NOT NULL,
    event_count integer DEFAULT 0 NOT NULL,
    calculation_duration_ms integer,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'Asia/Tokyo'::text),
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'Asia/Tokyo'::text),
    expires_at timestamp with time zone NOT NULL,
    is_valid boolean DEFAULT true
);


ALTER TABLE public.events_cache OWNER TO fuji_user;

--
-- Name: location_requests; Type: TABLE; Schema: public; Owner: fuji_user
--

CREATE TABLE public.location_requests (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    prefecture character varying(100) NOT NULL,
    description text NOT NULL,
    suggested_latitude numeric(10,8),
    suggested_longitude numeric(11,8),
    requester_ip inet NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'Asia/Tokyo'::text),
    processed_at timestamp with time zone,
    processed_by integer,
    CONSTRAINT location_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.location_requests OWNER TO fuji_user;

--
-- Name: location_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: fuji_user
--

CREATE SEQUENCE public.location_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.location_requests_id_seq OWNER TO fuji_user;

--
-- Name: location_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fuji_user
--

ALTER SEQUENCE public.location_requests_id_seq OWNED BY public.location_requests.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: fuji_user
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    prefecture character varying(100) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    elevation numeric(8,2) NOT NULL,
    description text,
    access_info text,
    warnings text,
    fuji_azimuth numeric(8,5),
    fuji_elevation numeric(8,5),
    fuji_distance numeric(10,3),
    created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'Asia/Tokyo'::text),
    updated_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'Asia/Tokyo'::text)
);


ALTER TABLE public.locations OWNER TO fuji_user;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: fuji_user
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.locations_id_seq OWNER TO fuji_user;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fuji_user
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: request_limits; Type: TABLE; Schema: public; Owner: fuji_user
--

CREATE TABLE public.request_limits (
    ip_address inet NOT NULL,
    last_request_at timestamp with time zone NOT NULL,
    request_count integer DEFAULT 1
);


ALTER TABLE public.request_limits OWNER TO fuji_user;

--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: location_requests id; Type: DEFAULT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.location_requests ALTER COLUMN id SET DEFAULT nextval('public.location_requests_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: fuji_user
--

COPY public.admins (id, username, email, password_hash, created_at, last_login, failed_login_count, locked_until) FROM stdin;
1	admin	admin@fuji-calendar.local	$2b$10$rOvHGXwVJ5F9gK8FvGQ9O.8FKA8tXKoLhcOqJLt4QzYpx8YOA8YcG	2025-07-23 17:08:10.12587+09	\N	0	\N
\.


--
-- Data for Name: events_cache; Type: TABLE DATA; Schema: public; Owner: fuji_user
--

COPY public.events_cache (cache_key, year, month, day, location_id, events_data, event_count, calculation_duration_ms, created_at, updated_at, expires_at, is_valid) FROM stdin;
\.


--
-- Data for Name: location_requests; Type: TABLE DATA; Schema: public; Owner: fuji_user
--

COPY public.location_requests (id, name, prefecture, description, suggested_latitude, suggested_longitude, requester_ip, status, created_at, processed_at, processed_by) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: fuji_user
--

COPY public.locations (id, name, prefecture, latitude, longitude, elevation, description, access_info, warnings, fuji_azimuth, fuji_elevation, fuji_distance, created_at, updated_at) FROM stdin;
1	東京スカイツリー	東京都	35.71010000	139.81070000	350.00	東京の新しいシンボル。展望台からの富士山撮影で有名	東武スカイツリーライン とうきょうスカイツリー駅直結	有料展望台。混雑時は事前予約推奨	248.68889	1.86093	105.445	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
2	東京タワー	東京都	35.65860000	139.74540000	250.00	東京のランドマーク。特別展望台からのダイヤモンド富士撮影	JR山手線神谷町駅徒歩7分、都営地下鉄赤羽橋駅徒歩5分	有料展望台。天候により富士山が見えない場合あり	250.51695	2.06227	97.920	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
3	六本木ヒルズ森タワー	東京都	35.66060000	139.72980000	270.00	都心からの富士山撮影の定番スポット	東京メトロ日比谷線六本木駅直結	有料展望台。混雑時は入場制限あり	250.10495	2.07711	96.668	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
4	新宿都庁展望室	東京都	35.68960000	139.69170000	202.00	無料で楽しめる都心からの富士山撮影スポット	JR新宿駅西口徒歩10分、都営地下鉄都庁前駅直結	無料だが営業時間に注意。年末年始休業あり	247.53667	2.16307	94.624	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
5	江ノ島	神奈川県	35.29890000	139.48030000	60.00	湘南の象徴。ダイヤモンド富士・パール富士の超有名撮影地	小田急江ノ島線片瀬江ノ島駅徒歩15分	混雑時は早めの場所取りが必要。潮位に注意	275.95366	3.09863	68.644	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
6	鎌倉高校前踏切	神奈川県	35.30670000	139.50140000	12.00	アニメ聖地としても有名。海越しの富士山撮影	江ノ島電鉄鎌倉高校前駅徒歩1分	踏切付近は交通安全に注意。撮影マナーを守る	275.10281	3.05756	70.467	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
7	横浜ランドマークタワー	神奈川県	35.45460000	139.63170000	296.00	横浜のシンボル。みなとみらいからの富士山撮影	JRみなとみらい線みなとみらい駅直結	有料展望台。天候により富士山が見えない場合あり	262.99412	2.41191	82.620	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
8	箱根・芦ノ湖	神奈川県	35.20000000	139.01670000	723.00	富士山に最も近い撮影地の一つ。逆さ富士でも有名	JR東海道線小田原駅からバス1時間	標高が高く気温差に注意。湖畔は風が強い場合あり	304.30036	5.49131	31.757	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
9	千葉ポートタワー	千葉県	35.60060000	140.10690000	125.00	千葉港のシンボル。東京湾越しの富士山撮影	JR京葉線千葉みなと駅徒歩12分	営業時間内のみ利用可能。強風時は展望台閉鎖の場合あり	258.34112	1.63731	127.728	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
10	犬吠埼灯台	千葉県	35.70690000	140.86940000	52.00	本州最東端。日の出とダイヤモンド富士の組み合わせ	JR総武本線銚子駅からバス20分	灯台内部は有料。強風・悪天候時は登れない場合あり	259.38722	1.07964	197.608	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
11	田貫湖	静岡県	35.33330000	138.61670000	650.00	ダイヤモンド富士の超有名撮影地。逆さ富士も美しい	JR身延線富士宮駅からバス50分	早朝撮影が多く、駐車場は満車になりやすい	73.14552	16.59530	10.489	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
12	三保松原	静岡県	34.98330000	138.51670000	2.00	世界文化遺産。松林越しの富士山撮影で有名	JR東海道線清水駅からバス25分	観光地のため混雑。駐車場有料	24.47537	4.67827	46.118	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
13	日本平	静岡県	34.96670000	138.38330000	300.00	富士山の絶景スポット。ロープウェイでアクセス	JR東海道線静岡駅からバス40分	ロープウェイの運行時間に注意	35.43374	3.69521	53.822	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
14	河口湖	山梨県	35.50560000	138.76440000	833.00	富士五湖の代表。逆さ富士の撮影地として世界的に有名	JR中央線大月駅から富士急行線河口湖駅	観光シーズンは大変混雑。早朝撮影推奨	191.75592	10.13234	16.468	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
15	山中湖	山梨県	35.41670000	138.86670000	980.00	富士五湖で最も標高が高い。ダイヤモンド富士の名所	JR中央線大月駅から富士急行線富士山駅、バス25分	標高が高く朝晩は冷え込む。防寒対策必要	243.75108	11.22822	14.084	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
16	精進湖	山梨県	35.48330000	138.61670000	900.00	富士五湖で最も小さく静寂。子抱き富士で有名	JR中央線大月駅から富士急行線河口湖駅、バス30分	アクセスがやや不便。公共交通機関の本数少ない	143.64427	9.63879	16.934	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
17	高尾山山頂	東京都	35.62560000	139.24310000	599.00	東京都内の定番富士山撮影地。山頂からの眺望が素晴らしい	京王線高尾山口駅からケーブルカー・リフト利用、徒歩1時間	登山装備推奨。冬季は積雪・凍結注意	237.89226	3.29345	44.591	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
18	陣馬山山頂	東京都	35.63330000	139.16670000	855.00	高尾山より高く、富士山の眺望が良い。白馬の像で有名	JR中央線高尾駅からバス、登山道徒歩2時間	本格的な登山。天候急変に注意	232.80336	3.34271	43.604	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
19	奥多摩湖	東京都	35.78330000	139.01670000	530.00	東京都内で富士山が見える数少ない山間部の湖	JR青梅線奥多摩駅からバス15分	山間部のため気温差大。アクセス道路は狭い	209.18846	3.45310	56.653	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
20	筑波山山頂	茨城県	36.21670000	140.10000000	877.00	関東平野から富士山を望む。日本百名山の一つ	つくばエクスプレスつくば駅からバス、ケーブルカー利用	天候により富士山が見えない場合多い。早朝推奨	232.84668	1.06346	136.461	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
21	大山山頂	神奈川県	35.43330000	139.25000000	1252.00	丹沢山地の名峰。富士山の眺望が素晴らしい	小田急線伊勢原駅からバス、ケーブルカー・登山道	本格的な登山。天候急変・滑落注意	260.46682	3.00665	19.429	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
22	丹沢・塔ノ岳	神奈川県	35.45000000	139.16670000	1491.00	丹沢主脈の主峰。富士山の大パノラマが楽しめる	小田急線渋沢駅からバス、登山道徒歩4時間	上級者向け登山。装備・体力必要	256.10848	3.18703	20.528	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
23	伊豆・大室山	静岡県	34.90000000	139.08330000	580.00	お椀型の美しい山。リフトで山頂へアクセス可能	JR伊東線伊東駅からバス35分、リフト利用	リフト運行時間に注意。強風時運休あり	327.81185	3.01965	35.601	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
24	伊豆・城ヶ崎海岸	静岡県	34.91670000	139.13330000	20.00	断崖絶壁から望む富士山。門脇つり橋で有名	JR伊東線伊東駅からバス35分	断崖注意。強風・高波時は危険	323.32906	3.48738	30.767	2025-07-20 11:39:08+09	2025-07-20 11:39:08+09
\.


--
-- Data for Name: request_limits; Type: TABLE DATA; Schema: public; Owner: fuji_user
--

COPY public.request_limits (ip_address, last_request_at, request_count) FROM stdin;
\.


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fuji_user
--

SELECT pg_catalog.setval('public.admins_id_seq', 3, true);


--
-- Name: location_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fuji_user
--

SELECT pg_catalog.setval('public.location_requests_id_seq', 1, false);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fuji_user
--

SELECT pg_catalog.setval('public.locations_id_seq', 24, true);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: events_cache events_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.events_cache
    ADD CONSTRAINT events_cache_pkey PRIMARY KEY (cache_key);


--
-- Name: location_requests location_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.location_requests
    ADD CONSTRAINT location_requests_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: request_limits request_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.request_limits
    ADD CONSTRAINT request_limits_pkey PRIMARY KEY (ip_address);


--
-- Name: idx_admins_username; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_admins_username ON public.admins USING btree (username);


--
-- Name: idx_events_cache_daily; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_events_cache_daily ON public.events_cache USING btree (year, month, day, location_id, is_valid);


--
-- Name: idx_events_cache_date; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_events_cache_date ON public.events_cache USING btree (year, month, day);


--
-- Name: idx_events_cache_expires; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_events_cache_expires ON public.events_cache USING btree (expires_at);


--
-- Name: idx_events_cache_location; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_events_cache_location ON public.events_cache USING btree (location_id);


--
-- Name: idx_events_cache_monthly; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_events_cache_monthly ON public.events_cache USING btree (year, month, is_valid, expires_at);


--
-- Name: idx_events_cache_valid; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_events_cache_valid ON public.events_cache USING btree (is_valid) WHERE (is_valid = true);


--
-- Name: idx_events_cache_year_month; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_events_cache_year_month ON public.events_cache USING btree (year, month);


--
-- Name: idx_location_requests_created; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_location_requests_created ON public.location_requests USING btree (created_at);


--
-- Name: idx_location_requests_status; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_location_requests_status ON public.location_requests USING btree (status);


--
-- Name: idx_locations_coords; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_locations_coords ON public.locations USING btree (latitude, longitude);


--
-- Name: idx_locations_fuji_distance; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_locations_fuji_distance ON public.locations USING btree (fuji_distance);


--
-- Name: idx_locations_prefecture; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_locations_prefecture ON public.locations USING btree (prefecture);


--
-- Name: idx_request_limits_ip; Type: INDEX; Schema: public; Owner: fuji_user
--

CREATE INDEX idx_request_limits_ip ON public.request_limits USING btree (ip_address);


--
-- Name: locations update_locations_updated_at; Type: TRIGGER; Schema: public; Owner: fuji_user
--

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events_cache events_cache_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.events_cache
    ADD CONSTRAINT events_cache_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: location_requests location_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fuji_user
--

ALTER TABLE ONLY public.location_requests
    ADD CONSTRAINT location_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.admins(id);


--
-- PostgreSQL database dump complete
--

