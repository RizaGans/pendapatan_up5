CREATE DATABASE IF NOT EXISTS pendapatan_up5 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pendapatan_up5;

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- Tahun yang tersedia di aplikasi, termasuk tahun yang belum memiliki data bulanan.
CREATE TABLE IF NOT EXISTS app_years (
  `year` SMALLINT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Satu baris per project, tahun, dan bulan. Semua angka dalam rupiah.
-- Status: b=Terbayar, f=Terbit FP, u=Verifikasi UIT/UID, p=UPT/UP2D, l=ULTG/ULP, h=HP Region
CREATE TABLE IF NOT EXISTS monthly (
  project_id INT NOT NULL,
  `year` SMALLINT NOT NULL,
  `month` TINYINT NOT NULL,
  t1 BIGINT NOT NULL DEFAULT 0,
  t2 BIGINT NOT NULL DEFAULT 0,
  lain BIGINT NOT NULL DEFAULT 0,
  denda BIGINT NOT NULL DEFAULT 0,
  reward BIGINT NOT NULL DEFAULT 0,
  kerja_kurang BIGINT NOT NULL DEFAULT 0,
  suplisi BIGINT NOT NULL DEFAULT 0,
  kontrak BIGINT NOT NULL DEFAULT 0,
  status CHAR(1) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, `year`, `month`),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Status warna opsional per field angka dalam satu bulan.
CREATE TABLE IF NOT EXISTS monthly_cell_status (
  project_id INT NOT NULL,
  `year` SMALLINT NOT NULL,
  `month` TINYINT NOT NULL,
  field TINYINT NOT NULL,
  status CHAR(1) NOT NULL,
  PRIMARY KEY (project_id, `year`, `month`, field),
  FOREIGN KEY (project_id, `year`, `month`) REFERENCES monthly(project_id, `year`, `month`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  project_id INT NULL,
  `year` SMALLINT NULL,
  `month` TINYINT NULL,
  field VARCHAR(20) NULL,
  old_value VARCHAR(40) NULL,
  new_value VARCHAR(40) NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'manual'
);
