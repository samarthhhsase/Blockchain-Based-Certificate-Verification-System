SET @db_name = DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'certificates'
        AND COLUMN_NAME = 'remarks'
    ),
    'SELECT 1',
    'ALTER TABLE certificates ADD COLUMN remarks TEXT NULL AFTER certificate_type'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
