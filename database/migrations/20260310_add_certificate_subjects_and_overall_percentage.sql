SET @db_name = DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'certificates'
        AND COLUMN_NAME = 'roll_no'
    ),
    'SELECT 1',
    'ALTER TABLE certificates ADD COLUMN roll_no VARCHAR(60) NULL AFTER semester'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'certificates'
        AND COLUMN_NAME = 'academic_year'
    ),
    'SELECT 1',
    'ALTER TABLE certificates ADD COLUMN academic_year VARCHAR(40) NULL AFTER roll_no'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'certificates'
        AND COLUMN_NAME = 'certificate_type'
    ),
    'SELECT 1',
    'ALTER TABLE certificates ADD COLUMN certificate_type VARCHAR(120) NULL AFTER academic_year'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'certificates'
        AND COLUMN_NAME = 'overall_percentage'
    ),
    'SELECT 1',
    'ALTER TABLE certificates ADD COLUMN overall_percentage DECIMAL(5,2) NULL AFTER certificate_type'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS certificate_subjects (
  id INT NOT NULL AUTO_INCREMENT,
  certificate_id INT NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  marks_scored DECIMAL(7,2) NOT NULL,
  out_of DECIMAL(7,2) NOT NULL,
  subject_percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_certificate_subjects_certificate_id (certificate_id),
  CONSTRAINT fk_certificate_subjects_certificate
    FOREIGN KEY (certificate_id) REFERENCES certificates (id)
    ON DELETE CASCADE
);
