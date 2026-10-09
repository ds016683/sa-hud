-- Lumen's email channel went live 10/8. The thread table's channel check did
-- not include 'email', so email turns were not being remembered. One line.
alter table lumen_messages drop constraint if exists lumen_messages_channel_check;
alter table lumen_messages add constraint lumen_messages_channel_check check (channel in ('whatsapp','sms','voice','pulse','hud','email'));
