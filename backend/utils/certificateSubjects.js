const pool = require('../db');

async function getSubjectsByCertificateIds(certificateIds, connection = pool) {
  if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
    return {};
  }

  const placeholders = certificateIds.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `SELECT
       id,
       certificate_id,
       subject_name,
       marks_scored,
       out_of,
       subject_percentage,
       created_at
     FROM certificate_subjects
     WHERE certificate_id IN (${placeholders})
     ORDER BY id ASC`,
    certificateIds
  );

  return rows.reduce((accumulator, row) => {
    if (!accumulator[row.certificate_id]) {
      accumulator[row.certificate_id] = [];
    }

    accumulator[row.certificate_id].push(row);
    return accumulator;
  }, {});
}

module.exports = { getSubjectsByCertificateIds };
