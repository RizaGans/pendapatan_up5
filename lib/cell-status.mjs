let ready;

export function ensureCellStatusTable(pool) {
  if (!ready) {
    ready = pool.query(`CREATE TABLE IF NOT EXISTS monthly_cell_status (
      project_id INT NOT NULL,
      \`year\` SMALLINT NOT NULL,
      \`month\` TINYINT NOT NULL,
      field TINYINT NOT NULL,
      status CHAR(1) NOT NULL,
      PRIMARY KEY (project_id, \`year\`, \`month\`, field),
      FOREIGN KEY (project_id, \`year\`, \`month\`) REFERENCES monthly(project_id, \`year\`, \`month\`) ON DELETE CASCADE
    )`);
  }
  return ready;
}
