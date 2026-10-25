CREATE TABLE public.online_visitors (
 id uuid PRIMARY KEY,
 last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.online_visitors TO service_role;
ALTER TABLE public.online_visitors ENABLE ROW LEVEL SECURITY;
CREATE INDEX online_visitors_last_seen_idx ON public.online_visitors(last_seen);