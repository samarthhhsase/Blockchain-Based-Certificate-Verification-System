const pool = require('../db');
const { getSubjectsByCertificateIds } = require('../utils/certificateSubjects');
const { roundToTwo } = require('../utils/marks');
const { verifyCertificateOnChain } = require('../services/blockchainService');

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'revoked') {
    return 'revoked';
  }

  return 'valid';
}

async function verifyCertificate(req, res) {
  try {
    const { id } = req.params;
    const rollNo = String(req.query.roll_no || '').trim();

    console.info('[ROUTE HIT] GET /api/public/verify/:id', {
      certificateId: id,
      rollNo,
    });

    if (!id) {
      return res.status(400).json({
        success: false,
        status: 'invalid_request',
        message: 'Certificate ID is required',
      });
    }

    const queryParams = [id];
    let sql = `
      SELECT
        c.id,
        c.certificate_no AS certificate_id,
        c.course,
        c.class AS class_name,
        c.semester,
        c.roll_no,
        c.academic_year AS year,
        c.certificate_type,
        c.remarks,
        c.overall_percentage,
        c.issue_date AS issued_at,
        c.status,
        c.certificate_hash,
        s.name AS student_name,
        i.name AS issuer_name
      FROM certificates c
      JOIN students s ON c.student_id = s.id
      LEFT JOIN issuers i ON c.issuer_id = i.id
      WHERE c.certificate_no = ?
    `;

    if (rollNo) {
      sql += ' AND c.roll_no = ?';
      queryParams.push(rollNo);
    }

    sql += ' LIMIT 1';

    const [rows] = await pool.execute(
      sql,
      queryParams
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        status: 'not_found',
        message: 'Certificate not found',
      });
    }

    const certificate = rows[0];
    const subjectsByCertificateId = await getSubjectsByCertificateIds([certificate.id]);
    const subjects = (subjectsByCertificateId[certificate.id] || []).map((subject) => ({
      id: subject.id,
      subject_name: subject.subject_name,
      marks_scored: Number(subject.marks_scored),
      out_of: Number(subject.out_of),
      subject_percentage: roundToTwo(subject.subject_percentage),
    }));
    let chainCertificate = null;
    let blockchainWarning = null;

    try {
      chainCertificate = await verifyCertificateOnChain(certificate.certificate_id);
    } catch (error) {
      blockchainWarning = error.message;
      console.error('[PUBLIC VERIFY ERROR]', {
        certificateId: certificate.certificate_id,
        message: error.message,
      });
    }

    if (chainCertificate && !chainCertificate.exists) {
      return res.status(409).json({
        success: false,
        status: 'not_found',
        message: 'Certificate exists in MySQL but was not found on Ganache',
      });
    }

    const hashMatches = chainCertificate ? chainCertificate.certificateHash === certificate.certificate_hash : null;
    if (chainCertificate && !hashMatches) {
      return res.status(409).json({
        success: false,
        status: 'error',
        message: 'Certificate hash mismatch between MySQL and Ganache',
      });
    }

    const status =
      (chainCertificate?.revoked || normalizeStatus(certificate.status) === 'revoked') ? 'revoked' : 'valid';

    return res.status(200).json({
      success: true,
      status,
      message:
        status === 'revoked'
          ? 'Certificate has been revoked'
          : blockchainWarning
            ? 'Certificate is valid in MySQL. Blockchain verification is currently unavailable.'
            : 'Certificate is valid',
      verified_at: new Date().toISOString(),
      certificate: {
        certificate_id: certificate.certificate_id,
        student_name: certificate.student_name,
        roll_no: certificate.roll_no || null,
        course: certificate.course,
        class_name: certificate.class_name || null,
        semester: certificate.semester || null,
        year: certificate.year || null,
        certificate_type: certificate.certificate_type || null,
        overall_percentage:
          certificate.overall_percentage === null ? null : roundToTwo(certificate.overall_percentage),
        remarks: certificate.remarks ? String(certificate.remarks).trim() : null,
        status,
        issued_at: certificate.issued_at,
        issuer_name: certificate.issuer_name || null,
        certificate_hash: certificate.certificate_hash,
        blockchain: {
          contract_status: chainCertificate ? (chainCertificate.revoked ? 'revoked' : 'valid') : 'unavailable',
          hash_matches: hashMatches,
          issuer_address: chainCertificate?.issuerAddress || null,
          issued_at: chainCertificate?.issuedAt ? new Date(chainCertificate.issuedAt * 1000).toISOString() : null,
          warning: blockchainWarning,
        },
        subjects,
      },
    });
  } catch (error) {
    console.error('[PUBLIC VERIFY ERROR]', error);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Failed to verify certificate',
      error: error.message,
    });
  }
}

module.exports = { verifyCertificate };
