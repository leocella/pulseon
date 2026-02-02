-- Remove the overly permissive read policy on queue_events
DROP POLICY IF EXISTS "Allow all reads on queue_events" ON public.queue_events;

-- Create a new policy that restricts read access to admins only
CREATE POLICY "Admins can view queue events"
ON public.queue_events
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));