const crypto = require('crypto');

function computeCertificateHash({
  studentName,
  course,
  grade,
  className,
  studentType,
  semester,
  issueDate,
  rollNo = '',
  academicYear = '',
  certificateType = '',
  overallPercentage = '',
  remarks = '',
  subjects = [],
}) {
  const normalizedSubjects = Array.isArray(subjects)
    ? subjects
        .map((subject) => [
          subject.subject_name,
          subject.marks_scored,
          subject.out_of,
          subject.subject_percentage,
        ].join(':'))
        .join('|')
    : '';

  const basePayload = `${studentName}${course}${grade}${className}${studentType}${semester}${issueDate}`;
  const hasExtendedMetadata =
    Boolean(rollNo) ||
    Boolean(academicYear) ||
    Boolean(certificateType) ||
    Boolean(remarks) ||
    (overallPercentage !== '' && overallPercentage !== null && overallPercentage !== undefined) ||
    Boolean(normalizedSubjects);

  const payload = hasExtendedMetadata
    ? [
        basePayload,
        rollNo,
        academicYear,
        certificateType,
        remarks,
        overallPercentage,
        normalizedSubjects,
      ].join('::')
    : basePayload;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = { computeCertificateHash };
