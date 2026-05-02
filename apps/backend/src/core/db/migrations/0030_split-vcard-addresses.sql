-- Move legacy vCard address fields to streetPrivate/cityPrivate/zipPrivate/statePrivate/countryPrivate
-- and drop the old keys. Business address fields are introduced empty (set by users going forward).

-- Step 1: copy each non-null legacy address field to its *Private counterpart,
-- but only if the *Private field is not already set.
UPDATE `qr_code`
SET `content` = JSON_SET(`content`, '$.data.streetPrivate', JSON_EXTRACT(`content`, '$.data.street'))
WHERE JSON_EXTRACT(`content`, '$.type') = 'vCard'
  AND JSON_EXTRACT(`content`, '$.data.street') IS NOT NULL
  AND JSON_EXTRACT(`content`, '$.data.streetPrivate') IS NULL;
--> statement-breakpoint
UPDATE `qr_code`
SET `content` = JSON_SET(`content`, '$.data.cityPrivate', JSON_EXTRACT(`content`, '$.data.city'))
WHERE JSON_EXTRACT(`content`, '$.type') = 'vCard'
  AND JSON_EXTRACT(`content`, '$.data.city') IS NOT NULL
  AND JSON_EXTRACT(`content`, '$.data.cityPrivate') IS NULL;
--> statement-breakpoint
UPDATE `qr_code`
SET `content` = JSON_SET(`content`, '$.data.zipPrivate', JSON_EXTRACT(`content`, '$.data.zip'))
WHERE JSON_EXTRACT(`content`, '$.type') = 'vCard'
  AND JSON_EXTRACT(`content`, '$.data.zip') IS NOT NULL
  AND JSON_EXTRACT(`content`, '$.data.zipPrivate') IS NULL;
--> statement-breakpoint
UPDATE `qr_code`
SET `content` = JSON_SET(`content`, '$.data.statePrivate', JSON_EXTRACT(`content`, '$.data.state'))
WHERE JSON_EXTRACT(`content`, '$.type') = 'vCard'
  AND JSON_EXTRACT(`content`, '$.data.state') IS NOT NULL
  AND JSON_EXTRACT(`content`, '$.data.statePrivate') IS NULL;
--> statement-breakpoint
UPDATE `qr_code`
SET `content` = JSON_SET(`content`, '$.data.countryPrivate', JSON_EXTRACT(`content`, '$.data.country'))
WHERE JSON_EXTRACT(`content`, '$.type') = 'vCard'
  AND JSON_EXTRACT(`content`, '$.data.country') IS NOT NULL
  AND JSON_EXTRACT(`content`, '$.data.countryPrivate') IS NULL;
--> statement-breakpoint
-- Step 2: drop legacy keys for all vCards (JSON_REMOVE ignores missing paths).
UPDATE `qr_code`
SET `content` = JSON_REMOVE(
  `content`,
  '$.data.street',
  '$.data.city',
  '$.data.zip',
  '$.data.state',
  '$.data.country'
)
WHERE JSON_EXTRACT(`content`, '$.type') = 'vCard';
