-- Increase file size limit to 500MB for panel-media bucket
UPDATE storage.buckets 
SET file_size_limit = 524288000 
WHERE id = 'panel-media';