-- Atualizar constraint para incluir NO_SHOW
ALTER TABLE queue_events DROP CONSTRAINT queue_events_event_type_check;

ALTER TABLE queue_events ADD CONSTRAINT queue_events_event_type_check 
CHECK (event_type = ANY (ARRAY['CALL'::text, 'RECALL'::text, 'SKIP'::text, 'FINISH'::text, 'CANCEL'::text, 'START_SERVICE'::text, 'NO_SHOW'::text]));