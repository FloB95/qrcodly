-- Rename isEditable to isDynamic in URL-type QR code content JSON
UPDATE `qr_code`
SET `content` = JSON_SET(
  JSON_REMOVE(`content`, '$.data.isEditable'),
  '$.data.isDynamic',
  JSON_EXTRACT(`content`, '$.data.isEditable')
)
WHERE JSON_EXTRACT(`content`, '$.type') = 'url'
AND JSON_EXTRACT(`content`, '$.data.isEditable') IS NOT NULL;
