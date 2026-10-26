export const BASE_ROWS = [
  { field: 0, label: 'Tagihan Tahap 1', sortOrder: 0 },
  { field: 1, label: 'Tagihan Tahap 2', sortOrder: 1 },
  { field: 2, label: 'Lembur / Sweeping / Lainnya', sortOrder: 2 },
  { field: 6, label: 'Suplisi', sortOrder: 3 },
  { field: 4, label: 'Reward', sortOrder: 4 },
  { field: 5, label: 'Kerja Kurang', sortOrder: 5 },
  { field: 3, label: 'Denda', sortOrder: 6 },
  { field: 7, label: 'Nilai Kontrak', sortOrder: 7 },
];

export async function ensureProjectRowTables(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS project_rows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    label VARCHAR(120) NOT NULL,
    operation ENUM('add','subtract') NOT NULL DEFAULT 'add',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY project_row_label (project_id, label)
  ) ENGINE=InnoDB`);
  await db.query(`CREATE TABLE IF NOT EXISTS project_row_values (
    row_id INT NOT NULL,
    \`year\` SMALLINT NOT NULL,
    \`month\` TINYINT NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (row_id, \`year\`, \`month\`),
    FOREIGN KEY (row_id) REFERENCES project_rows(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  await db.query(`CREATE TABLE IF NOT EXISTS project_base_rows (
    project_id INT NOT NULL,
    field TINYINT NOT NULL,
    label VARCHAR(120) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id,field),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  const [projects] = await db.query('SELECT id FROM projects');
  for (const project of projects) {
    for (const row of BASE_ROWS) {
      await db.query('INSERT IGNORE INTO project_base_rows (project_id,field,label,sort_order) VALUES (?,?,?,?)', [project.id, row.field, row.label, row.sortOrder]);
    }
  }
  const [columns] = await db.query("SHOW COLUMNS FROM project_rows LIKE 'operation'");
  if (!columns.length) {
    await db.query("ALTER TABLE project_rows ADD COLUMN operation ENUM('add','subtract') NOT NULL DEFAULT 'add' AFTER label");
  }
}
