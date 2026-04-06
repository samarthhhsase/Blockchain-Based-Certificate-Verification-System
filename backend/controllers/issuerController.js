const pool = require('../db');
const { generateCertificateNumber } = require('../utils/certificateNumber');
const { computeCertificateHash } = require('../utils/hash');
const { getSubjectsByCertificateIds } = require('../utils/certificateSubjects');
const { normalizeSubjects, calculateOverallPercentage, roundToTwo } = require('../utils/marks');
const blockchainService = require('../services/blockchainService');
const { buildCertificatePdf } = require('../services/pdfService');
const { logAudit } = require('../utils/auditLog');

const ALLOWED_CLASSES = new Set(['FE', 'SE', 'TE', 'BE']);
const ALLOWED_STUDENT_TYPES = new Set(['Regular', 'Dropper']);
const ALLOWED_SEMESTERS = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
const STATUS_VALID = 'Valid';
const STATUS_REVOKED = 'Revoked';

function normalizeDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeIssueMetadata({ className, studentType, semester }) {
  const normalized = {
    className: typeof className === 'string' ? className.trim().toUpperCase() : '',
    studentType: typeof studentType === 'string' ? studentType.trim() : '',
    semester: typeof semester === 'string' ? semester.trim().toUpperCase() : '',
  };

  if (normalized.studentType) {
    const lowered = normalized.studentType.toLowerCase();
    normalized.studentType = lowered === 'regular' ? 'Regular' : lowered === 'dropper' ? 'Dropper' : normalized.studentType;
  }

  return normalized;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function formatIssueErrorMessage(stage, error, blockchainTxHash) {
  if (stage === 'blockchain_write') {
    return {
      message: 'Blockchain transaction failed',
      error: error.message,
    };
  }

  if (blockchainTxHash) {
    return {
      message: 'Certificate was issued on blockchain but failed to save in database',
      error: error.message,
    };
  }

  return {
    message: 'Failed to issue certificate',
    error: error.message,
  };
}

function toNullableText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeRemarks(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length > 500) {
    throw new Error('remarks must be 500 characters or fewer');
  }

  return normalized;
}

async function generateUniqueCertificateNo() {
  for (let i = 0; i < 20; i += 1) {
    const certNo = generateCertificateNumber();
    const [rows] = await pool.execute('SELECT id FROM certificates WHERE certificate_no = ? LIMIT 1', [certNo]);
    if (rows.length === 0) {
      return certNo;
    }
  }

  throw new Error('Failed to generate unique certificate number');
}

async function getStudents(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC`
    );

    return res.status(200).json({ students: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
}

async function issueCertificate(req, res) {
  let connection;
  let issueStage = 'request_received';
  let blockchainTxHash = null;
  let generatedCertificateNo = null;
  let generatedCertificateHash = null;
  try {
    console.info('[ISSUER][ISSUE] request received', {
      body: req.body,
      user: req.user,
    });

    const {
      studentId,
      student_name: studentNameFromClient,
      course,
      grade,
      issueDate,
      class: classNameLegacy,
      class_name: classNameFromClient,
      studentType,
      semester,
      roll_no: rollNo,
      year,
      certificate_type: certificateType,
      remarks,
      subjects,
    } = req.body || {};

    const issuerProfileId = Number(req.user?.profileId);
    const userRole = String(req.user?.role || '').trim().toLowerCase();
    const className = classNameFromClient || classNameLegacy;
    const trimmedStudentNameFromClient = normalizeText(studentNameFromClient);
    const trimmedCourse = normalizeText(course);
    const trimmedGrade = normalizeText(grade);
    const normalizedRollNo = normalizeText(rollNo);
    const normalizedAcademicYear = normalizeText(year);
    const normalizedCertificateType = normalizeText(certificateType);
    const normalizedStudentId = Number(studentId);

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Token missing or invalid' });
    }

    if (userRole !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!Number.isInteger(issuerProfileId) || issuerProfileId <= 0) {
      return res.status(401).json({ success: false, message: 'Unauthorized: issuer profile missing' });
    }

    console.info('[ISSUER][ISSUE] auth context', {
      authenticatedUser: req.user,
      issuerId: issuerProfileId,
    });

    if (!Number.isInteger(normalizedStudentId) || normalizedStudentId <= 0) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }

    if (
      !trimmedStudentNameFromClient ||
      !trimmedCourse ||
      !trimmedGrade ||
      !normalizeText(issueDate) ||
      !normalizeText(className) ||
      !normalizeText(studentType) ||
      !normalizeText(semester)
    ) {
      return res.status(400).json({
        success: false,
        message: 'student_name, course, grade, issueDate, class, studentType, and semester are required',
      });
    }

    if (!normalizedRollNo) {
      return res.status(400).json({ success: false, message: 'roll_no is required' });
    }

    if (!normalizedAcademicYear) {
      return res.status(400).json({ success: false, message: 'year is required' });
    }

    if (!normalizedCertificateType) {
      return res.status(400).json({ success: false, message: 'certificate_type is required' });
    }

    issueStage = 'validate_request';
    const normalizedIssueDate = normalizeDate(issueDate);
    if (!normalizedIssueDate) {
      return res.status(400).json({ success: false, message: 'issueDate is invalid' });
    }

    const normalizedMeta = normalizeIssueMetadata({ className, studentType, semester });
    if (!ALLOWED_CLASSES.has(normalizedMeta.className)) {
      return res.status(400).json({ success: false, message: 'class must be one of FE, SE, TE, BE' });
    }
    if (!ALLOWED_STUDENT_TYPES.has(normalizedMeta.studentType)) {
      return res.status(400).json({ success: false, message: 'studentType must be one of Regular, Dropper' });
    }
    if (!ALLOWED_SEMESTERS.has(normalizedMeta.semester)) {
      return res.status(400).json({ success: false, message: 'semester must be one of I, II, III, IV, V, VI, VII, VIII' });
    }

    let normalizedSubjects;
    let validatedOverallPercentage;
    try {
      normalizedSubjects = normalizeSubjects(subjects);
      validatedOverallPercentage = calculateOverallPercentage(normalizedSubjects);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message, error: error.message });
    }

    issueStage = 'verify_student';
    const [studentRows] = await pool.execute('SELECT id, name FROM students WHERE id = ? LIMIT 1', [normalizedStudentId]);
    console.info('[ISSUER][ISSUE] student lookup', {
      studentId: normalizedStudentId,
      resultCount: studentRows.length,
      student: studentRows[0] || null,
    });

    if (studentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [studentEmailRows] = await pool.execute(
      `SELECT u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?
       LIMIT 1`,
      [normalizedStudentId]
    );

    issueStage = 'verify_issuer';
    const [issuerRows] = await pool.execute('SELECT id, name FROM issuers WHERE id = ? LIMIT 1', [issuerProfileId]);
    if (issuerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Issuer profile missing' });
    }

    const certNo = await generateUniqueCertificateNo();
    const studentName = studentRows[0].name;
    const issuerName = issuerRows[0].name;
    let normalizedRemarks;
    try {
      normalizedRemarks = normalizeRemarks(remarks);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message, error: error.message });
    }

    const certificateHash = computeCertificateHash({
      studentName,
      course: trimmedCourse,
      grade: trimmedGrade,
      className: normalizedMeta.className,
      studentType: normalizedMeta.studentType,
      semester: normalizedMeta.semester,
      issueDate: normalizedIssueDate,
      rollNo: normalizedRollNo,
      academicYear: normalizedAcademicYear,
      certificateType: normalizedCertificateType,
      remarks: normalizedRemarks,
      overallPercentage: validatedOverallPercentage,
      subjects: normalizedSubjects,
    });

    generatedCertificateNo = certNo;
    generatedCertificateHash = certificateHash;
    console.info('[ISSUER][ISSUE] generated certificate metadata', {
      issuerId: issuerProfileId,
      certificateId: generatedCertificateNo,
      certificateHash: generatedCertificateHash,
    });

    if (trimmedStudentNameFromClient !== studentName) {
      return res.status(400).json({ success: false, message: 'student_name does not match the selected student' });
    }

    issueStage = 'blockchain_write';
    const chainReceipt = await blockchainService.issueCertificateOnChain({
      certificateHash,
      certificateId: certNo,
      studentName,
      course: trimmedCourse,
    });
    blockchainTxHash = chainReceipt.transactionHash;
    console.info('[ISSUER][ISSUE] blockchain tx result', {
      certificateId: certNo,
      certificateHash,
      blockchainTxHash,
      blockchainReceipt: chainReceipt,
    });

    issueStage = 'mysql_insert';
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [insertResult] = await connection.execute(
      `INSERT INTO certificates (
        certificate_no,
        student_id,
        issuer_id,
        student_name,
        course,
        grade,
        class,
        student_type,
        semester,
        issue_date,
        certificate_hash,
        blockchain_tx_hash,
        ipfs_hash,
        status,
        is_revoked,
        roll_no,
        academic_year,
        certificate_type,
        remarks,
        overall_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        certNo,
        normalizedStudentId,
        issuerProfileId,
        studentName,
        trimmedCourse,
        trimmedGrade,
        normalizedMeta.className,
        normalizedMeta.studentType,
        normalizedMeta.semester,
        normalizedIssueDate,
        certificateHash,
        blockchainTxHash,
        null,
        STATUS_VALID,
        false,
        normalizedRollNo,
        normalizedAcademicYear,
        normalizedCertificateType,
        normalizedRemarks,
        validatedOverallPercentage,
      ]
    );
    console.info('[ISSUER][ISSUE] mysql insert result', {
      certificateId: certNo,
      insertId: insertResult.insertId,
      affectedRows: insertResult.affectedRows,
    });

    issueStage = 'mysql_insert_subjects';
    await Promise.all(
      normalizedSubjects.map((subject) =>
        connection.execute(
          `INSERT INTO certificate_subjects (
            certificate_id,
            subject_name,
            marks_scored,
            out_of,
            subject_percentage
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            insertResult.insertId,
            subject.subject_name,
            subject.marks_scored,
            subject.out_of,
            subject.subject_percentage,
          ]
        )
      )
    );

    issueStage = 'audit_log';
    await connection.execute(
      `INSERT INTO audit_logs (user_id, action, certificate_id, old_data, new_data)
       VALUES (?, ?, ?, NULL, ?)`,
      [
        req.user.userId,
        'ISSUE_CERTIFICATE',
        insertResult.insertId,
        JSON.stringify({
          certificateNo: certNo,
          studentId: normalizedStudentId,
          studentName,
          course: trimmedCourse,
          grade: trimmedGrade,
          class: normalizedMeta.className,
          class_name: normalizedMeta.className,
          studentType: normalizedMeta.studentType,
          semester: normalizedMeta.semester,
          roll_no: normalizedRollNo,
          year: normalizedAcademicYear,
          certificate_type: normalizedCertificateType,
          remarks: normalizedRemarks,
          overall_percentage: validatedOverallPercentage,
          subjects: normalizedSubjects,
          status: STATUS_VALID,
        }),
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      certificate: {
        id: insertResult.insertId,
        certificateNo: certNo,
        studentId: normalizedStudentId,
        studentName,
        course: trimmedCourse,
        grade: trimmedGrade,
        class: normalizedMeta.className,
        class_name: normalizedMeta.className,
        studentType: normalizedMeta.studentType,
        semester: normalizedMeta.semester,
        issueDate: normalizedIssueDate,
        roll_no: normalizedRollNo,
        year: normalizedAcademicYear,
        certificate_type: normalizedCertificateType,
        remarks: normalizedRemarks,
        overall_percentage: validatedOverallPercentage,
        subjects: normalizedSubjects,
        certificateHash,
        blockchainTxHash,
        ipfsHash: null,
        status: STATUS_VALID,
        studentEmail: studentEmailRows[0]?.email || null,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('[ISSUER][ISSUE] ERROR', {
      stage: issueStage,
      requestBody: req.body,
      authenticatedUser: req.user,
      issuerId: req.user?.profileId || null,
      certificateId: generatedCertificateNo,
      certificateHash: generatedCertificateHash,
      blockchainTxHash,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    const errorResponse = formatIssueErrorMessage(issueStage, error, blockchainTxHash);
    return res.status(500).json({
      success: false,
      message: errorResponse.message,
      error: errorResponse.error,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function editCertificate(req, res) {
  try {
    const { certNo } = req.params;
    const { course, grade, remarks } = req.body || {};
    const trimmedCourse = normalizeText(course);
    const trimmedGrade = normalizeText(grade);

    if (!trimmedCourse || !trimmedGrade) {
      return res.status(400).json({ message: 'course and grade are required' });
    }

    let normalizedRemarks;
    try {
      normalizedRemarks = normalizeRemarks(remarks);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const [rows] = await pool.execute(
      `SELECT c.id, c.issue_date, c.status, c.class, c.student_type, c.semester, c.course, c.grade,
              c.roll_no, c.academic_year, c.certificate_type, c.remarks, c.overall_percentage,
              s.name AS student_name, i.name AS issuer_name
       FROM certificates c
       JOIN students s ON c.student_id = s.id
       JOIN issuers i ON c.issuer_id = i.id
       WHERE c.certificate_no = ? AND c.issuer_id = ?
       LIMIT 1`,
      [certNo, req.user.profileId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const certificate = rows[0];
    const subjectsByCertificateId = await getSubjectsByCertificateIds([certificate.id]);
    const certificateSubjects = subjectsByCertificateId[certificate.id] || [];
    if (certificate.status === STATUS_REVOKED) {
      return res.status(409).json({ message: 'Cannot edit revoked certificate' });
    }

    const normalizedIssueDate = normalizeDate(certificate.issue_date);
    const newHash = computeCertificateHash({
      studentName: certificate.student_name,
      course: trimmedCourse,
      grade: trimmedGrade,
      className: certificate.class,
      studentType: certificate.student_type,
      semester: certificate.semester,
      issueDate: normalizedIssueDate,
      rollNo: certificate.roll_no,
      academicYear: certificate.academic_year,
      certificateType: certificate.certificate_type,
      remarks: normalizedRemarks,
      overallPercentage: certificate.overall_percentage,
      subjects: certificateSubjects,
    });

    const editedPdf = await buildCertificatePdf({
      certificate_no: certNo,
      student_name: certificate.student_name,
      course: trimmedCourse,
      grade: trimmedGrade,
      class: certificate.class,
      student_type: certificate.student_type,
      semester: certificate.semester,
      issue_date: normalizedIssueDate,
      issuer_name: certificate.issuer_name,
      certificate_hash: newHash,
      blockchain_tx_hash: 'Pending',
      status: certificate.status,
      ipfs_hash: null,
      roll_no: certificate.roll_no,
      academic_year: certificate.academic_year,
      certificate_type: certificate.certificate_type,
      remarks: normalizedRemarks,
      overall_percentage: roundToTwo(certificate.overall_percentage || 0),
      subjects: certificateSubjects,
    });
    const infrastructureWarnings = ['Certificate content updated in MySQL. Re-issuing on chain is not supported for an existing certificate ID.'];

    await pool.execute(
      `UPDATE certificates
       SET course = ?, grade = ?, remarks = ?, certificate_hash = ?, ipfs_hash = ?
       WHERE id = ?`,
      [trimmedCourse, trimmedGrade, normalizedRemarks, newHash, null, certificate.id]
    );

    await logAudit({
      userId: req.user.userId,
      action: 'EDIT_CERTIFICATE',
      certificateId: certificate.id,
      oldData: { course: certificate.course, grade: certificate.grade, remarks: certificate.remarks },
      newData: { course: trimmedCourse, grade: trimmedGrade, remarks: normalizedRemarks, warnings: infrastructureWarnings },
    });

    return res.status(200).json({
      message: 'Certificate updated successfully',
      certificate: {
        certificateNo: certNo,
        course: trimmedCourse,
        grade: trimmedGrade,
        remarks: normalizedRemarks,
        certificateHash: newHash,
        blockchainTxHash: null,
        ipfsHash: null,
        warnings: infrastructureWarnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to edit certificate', error: error.message });
  }
}

async function revokeCertificate(req, res) {
  let blockchainWarning = null;
  try {
    const certNo = String(req.params?.certNo || '').trim();
    console.log('[ISSUER][REVOKE] request', {
      params: req.params,
      body: req.body,
      user: req.user,
      certNo,
    });

    if (!certNo) {
      return res.status(400).json({ success: false, message: 'Certificate number is required' });
    }

    const [rows] = await pool.execute(
      'SELECT id, status FROM certificates WHERE certificate_no = ? AND issuer_id = ? LIMIT 1',
      [certNo, req.user.profileId]
    );
    console.log('[ISSUER][REVOKE] lookup', { certNo, issuerId: req.user.profileId, rowCount: rows.length, rows });

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    if (rows[0].status === STATUS_REVOKED) {
      return res.status(409).json({ success: false, message: 'Certificate already revoked' });
    }

    try {
      await blockchainService.revokeCertificateOnChain(certNo);
    } catch (error) {
      blockchainWarning = 'Blockchain revoke could not be synced. Certificate was revoked in MySQL only.';
      console.error('[ISSUER][REVOKE] blockchain revoke failed', {
        certNo,
        issuerId: req.user.profileId,
        message: error.message,
        warning: blockchainWarning,
      });
    }

    await pool.execute(
      'UPDATE certificates SET status = ?, is_revoked = TRUE WHERE id = ?',
      [STATUS_REVOKED, rows[0].id]
    );

    await logAudit({
      userId: req.user.userId,
      action: 'REVOKE_CERTIFICATE',
      certificateId: rows[0].id,
      oldData: { status: rows[0].status },
      newData: { status: STATUS_REVOKED, blockchainWarning },
    });

    return res.status(200).json({
      success: true,
      message: 'Certificate revoked successfully',
      warning: blockchainWarning,
    });
  } catch (error) {
    console.error('[ISSUER][REVOKE] ERROR:', error);
    return res.status(500).json({ success: false, message: 'Failed to revoke certificate', error: error.message });
  }
}

async function getIssuedCertificates(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         c.id,
         c.id AS certificate_id,
         c.certificate_no,
         c.issuer_id,
         c.course,
         c.grade,
         c.class,
         c.student_type,
         c.semester,
         c.roll_no,
         c.academic_year,
         c.certificate_type,
         c.remarks,
         c.overall_percentage,
         c.issue_date,
         c.certificate_hash,
         c.blockchain_tx_hash,
         c.ipfs_hash,
         c.status,
         c.created_at,
         s.name AS student_name,
         u.email AS student_email
       FROM certificates c
       JOIN students s ON c.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE c.issuer_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.profileId]
    );

    const subjectsByCertificateId = await getSubjectsByCertificateIds(rows.map((row) => row.id));
    const certificates = rows.map((row) => ({
      ...row,
      overall_percentage: row.overall_percentage === null ? null : roundToTwo(row.overall_percentage),
      year: row.academic_year,
      class_name: row.class,
      remarks: row.remarks,
      subjects: subjectsByCertificateId[row.id] || [],
    }));

    return res.status(200).json({ certificates });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch certificates', error: error.message });
  }
}

async function getDashboardStats(req, res) {
  try {
    const [issuedRows] = await pool.execute(
      'SELECT COUNT(*) AS totalIssued FROM certificates WHERE issuer_id = ?',
      [req.user.profileId]
    );

    const [revokedRows] = await pool.execute(
      'SELECT COUNT(*) AS totalRevoked FROM certificates WHERE issuer_id = ? AND status = ?',
      [req.user.profileId, STATUS_REVOKED]
    );

    const [complaintRows] = await pool.execute(
      `SELECT COUNT(*) AS totalComplaints
       FROM complaints cp
       JOIN certificates c ON cp.certificate_id = c.id
       WHERE c.issuer_id = ?`,
      [req.user.profileId]
    );

    return res.status(200).json({
      stats: {
        totalIssued: Number(issuedRows[0].totalIssued),
        totalRevoked: Number(revokedRows[0].totalRevoked),
        totalComplaints: Number(complaintRows[0].totalComplaints),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
}

async function downloadPdf(req, res) {
  try {
    const { certNo } = req.params;

    const [rows] = await pool.execute(
      `SELECT
         c.id,
         c.certificate_no,
         c.course,
         c.grade,
         c.class,
         c.student_type,
         c.semester,
         c.roll_no,
         c.academic_year,
         c.certificate_type,
         c.remarks,
         c.overall_percentage,
         c.issue_date,
         c.certificate_hash,
         c.blockchain_tx_hash,
         c.ipfs_hash,
         c.status,
         s.name AS student_name,
         i.name AS issuer_name
       FROM certificates c
       JOIN students s ON c.student_id = s.id
       JOIN issuers i ON c.issuer_id = i.id
       WHERE c.certificate_no = ? AND c.issuer_id = ?
       LIMIT 1`,
      [certNo, req.user.profileId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const subjectsByCertificateId = await getSubjectsByCertificateIds([rows[0].id]);
    const pdfBuffer = await buildCertificatePdf({
      ...rows[0],
      subjects: subjectsByCertificateId[rows[0].id] || [],
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certNo}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
}

async function getComplaints(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         cp.id,
       cp.message,
       cp.response,
        cp.status,
        cp.created_at,
         c.certificate_no,
         s.name AS student_name
       FROM complaints cp
       JOIN certificates c ON cp.certificate_id = c.id
       JOIN students s ON cp.student_id = s.id
       WHERE c.issuer_id = ?
       ORDER BY cp.created_at DESC`,
      [req.user.profileId]
    );

    return res.status(200).json({ complaints: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
}

async function resolveComplaint(req, res) {
  try {
    const { complaintId } = req.params;
    const { response } = req.body || {};

    if (!response || response.trim().length < 2) {
      return res.status(400).json({ message: 'response is required' });
    }

    const [rows] = await pool.execute(
      `SELECT cp.id, c.id AS certificate_id
       FROM complaints cp
       JOIN certificates c ON cp.certificate_id = c.id
       WHERE cp.id = ? AND c.issuer_id = ?
       LIMIT 1`,
      [complaintId, req.user.profileId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    await pool.execute('UPDATE complaints SET status = "resolved", response = ? WHERE id = ?', [
      response.trim(),
      complaintId,
    ]);
    await logAudit({
      userId: req.user.userId,
      action: 'RESPOND_COMPLAINT',
      certificateId: rows[0].certificate_id,
      newData: { complaintId: Number(complaintId), status: 'resolved', response: response.trim() },
    });

    return res.status(200).json({ message: 'Complaint responded successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to resolve complaint', error: error.message });
  }
}

async function deleteCertificate(req, res) {
  let connection;
  try {
    const certNo = String(req.params?.certNo || '').trim();
    console.log('[ISSUER][DELETE] request', {
      params: req.params,
      body: req.body,
      user: req.user,
      certNo,
    });

    if (!certNo) {
      return res.status(400).json({ success: false, message: 'Certificate number is required' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, status
       FROM certificates
       WHERE certificate_no = ? AND issuer_id = ?
       LIMIT 1`,
      [certNo, req.user.profileId]
    );
    console.log('[ISSUER][DELETE] lookup', { certNo, issuerId: req.user.profileId, rowCount: rows.length, rows });

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    await connection.execute('DELETE FROM complaints WHERE certificate_id = ?', [rows[0].id]);
    await connection.execute('UPDATE audit_logs SET certificate_id = NULL WHERE certificate_id = ?', [rows[0].id]);
    await connection.execute('DELETE FROM certificates WHERE id = ?', [rows[0].id]);
    await connection.execute(
      `INSERT INTO audit_logs (user_id, action, certificate_id, old_data, new_data)
       VALUES (?, ?, NULL, ?, NULL)`,
      [
        req.user.userId,
        'DELETE_CERTIFICATE',
        JSON.stringify({ certificateNo: certNo, status: rows[0].status }),
      ]
    );
    await connection.commit();

    return res.status(200).json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('[ISSUER][DELETE] ERROR:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete certificate', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function getAuditLogs(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         al.id,
         al.action,
         al.certificate_id,
         al.old_data,
         al.new_data,
         al.created_at
       FROM audit_logs al
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT 300`,
      [req.user.userId]
    );

    return res.status(200).json({ logs: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
  }
}

module.exports = {
  getStudents,
  issueCertificate,
  editCertificate,
  revokeCertificate,
  getIssuedCertificates,
  getDashboardStats,
  downloadPdf,
  getComplaints,
  resolveComplaint,
  deleteCertificate,
  getAuditLogs,
};
