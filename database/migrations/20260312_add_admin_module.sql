CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL,
  admin_name VARCHAR(150) NOT NULL,
  login_id VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET @add_admin_email = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'admins'
        AND COLUMN_NAME = 'email'
    ),
    'SELECT 1',
    'ALTER TABLE admins ADD COLUMN email VARCHAR(150) NULL AFTER login_id'
  )
);
PREPARE stmt FROM @add_admin_email;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE admins
SET email = CONCAT('admin', id, '@local.admin')
WHERE email IS NULL OR TRIM(email) = '';

SET @admin_email_index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admins'
    AND INDEX_NAME = 'uq_admins_email'
);
SET @add_admin_email_index = IF(
  @admin_email_index_exists > 0,
  'SELECT 1',
  'ALTER TABLE admins ADD UNIQUE KEY uq_admins_email (email)'
);
PREPARE stmt FROM @add_admin_email_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE admins
MODIFY COLUMN email VARCHAR(150) NOT NULL;

ALTER TABLE users
MODIFY COLUMN role ENUM('admin','issuer','student') NOT NULL;

SET @add_issuer_admin_id = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'issuers'
        AND COLUMN_NAME = 'admin_id'
    ),
    'SELECT 1',
    'ALTER TABLE issuers ADD COLUMN admin_id INT NULL AFTER user_id'
  )
);
PREPARE stmt FROM @add_issuer_admin_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_issuer_institute_name = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'issuers'
        AND COLUMN_NAME = 'institute_name'
    ),
    'SELECT 1',
    'ALTER TABLE issuers ADD COLUMN institute_name VARCHAR(255) NULL AFTER password'
  )
);
PREPARE stmt FROM @add_issuer_institute_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_issuer_is_active = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'issuers'
        AND COLUMN_NAME = 'is_active'
    ),
    'SELECT 1',
    'ALTER TABLE issuers ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER institute_name'
  )
);
PREPARE stmt FROM @add_issuer_is_active;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_student_roll_number = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'roll_number'
    ),
    'SELECT 1',
    'ALTER TABLE students ADD COLUMN roll_number VARCHAR(60) NULL AFTER password'
  )
);
PREPARE stmt FROM @add_student_roll_number;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_student_course = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'course'
    ),
    'SELECT 1',
    'ALTER TABLE students ADD COLUMN course VARCHAR(220) NULL AFTER roll_number'
  )
);
PREPARE stmt FROM @add_student_course;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_student_class_name = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'class_name'
    ),
    'SELECT 1',
    'ALTER TABLE students ADD COLUMN class_name VARCHAR(50) NULL AFTER course'
  )
);
PREPARE stmt FROM @add_student_class_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_student_semester = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'semester'
    ),
    'SELECT 1',
    'ALTER TABLE students ADD COLUMN semester VARCHAR(20) NULL AFTER class_name'
  )
);
PREPARE stmt FROM @add_student_semester;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @student_roll_index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'students'
    AND INDEX_NAME = 'uq_students_roll_number'
);
SET @add_student_roll_index = IF(
  @student_roll_index_exists > 0,
  'SELECT 1',
  'ALTER TABLE students ADD UNIQUE KEY uq_students_roll_number (roll_number)'
);
PREPARE stmt FROM @add_student_roll_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @issuer_admin_fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'issuers'
    AND CONSTRAINT_NAME = 'fk_issuers_admin_id'
);
SET @add_issuer_admin_fk = IF(
  @issuer_admin_fk_exists > 0,
  'SELECT 1',
  'ALTER TABLE issuers ADD CONSTRAINT fk_issuers_admin_id FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @add_issuer_admin_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE issuers
SET is_active = 1
WHERE is_active IS NULL;
