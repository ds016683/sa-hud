-- Live Protocols (David, 10/23): one table of protocol rows per item, not one
-- pill per protocol. edit_punchlist grows a protocol name (editing | briefing |
-- whatever comes next), the Briefing Protocol's fields (source: who supplies
-- the item, why it is needed, the ruling when David says leave it), and
-- live_files learns which files are pinned as the evidence that the Polaris
-- objective was met. Run once in the Supabase SQL editor.
alter table edit_punchlist add column if not exists protocol text not null default 'editing';
alter table edit_punchlist add column if not exists source   text;   -- briefing: david | file | tool
alter table edit_punchlist add column if not exists why      text;   -- briefing: why the item is needed
alter table edit_punchlist add column if not exists ruling   text;   -- briefing: David's ruling when the gap is closed without a fill
create index if not exists edit_punchlist_protocol_idx on edit_punchlist (protocol, status);

alter table live_files add column if not exists evidence boolean not null default false;
create index if not exists live_files_evidence_idx on live_files (objective_id) where evidence;
