-- Custom SQL migration file, put your code below! --

-- Seed the safety re-check due queue for existing short URLs.
--
-- Nothing has ever been re-checked, so without this every row would come due at once and the first
-- job run would fire one Web Risk lookup per link in a single burst. CRC32(id) % 7 spreads the
-- backlog deterministically across the coming week, which matches the 7-day established tier.
--
-- Reserved codes (destination_url IS NULL) stay NULL and never enter the queue — there is nothing
-- to screen until a destination is set, and that write goes through the synchronous check.
UPDATE `short_url`
SET `next_safety_check_at` = DATE_ADD(NOW(), INTERVAL (CRC32(`id`) % 7) DAY)
WHERE `destination_url` IS NOT NULL
  AND `deleted_at` IS NULL
  AND `next_safety_check_at` IS NULL;
