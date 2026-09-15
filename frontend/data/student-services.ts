export interface CampusService {
  id: string;
  title: string;
  category: "Academic" | "Financial" | "Registrar" | "Technology" | "Facilities" | "Library" | "Health" | "Career";
  department: string;
  description: string;
  actionType:
    | "fee_payment"
    | "hall_ticket"
    | "bonafide_certificate"
    | "academic_advising"
    | "it_support"
    | "hostel_service"
    | "library_service"
    | "health_clinic"
    | "career_noc";
  actionLabel: string;
  commonRequests: string[];
  location: string;
  hours: string;
  contact: string;
  icon: string;
  badge?: string;
}

export const CAMPUS_SERVICES: CampusService[] = [
  {
    id: "financial-aid",
    title: "Student Accounts & Fee Payments",
    category: "Financial",
    department: "Bursar & Financial Aid Office",
    description: "Manage tuition fee payments, download official fee receipts, check outstanding balances, and apply for financial assistance.",
    actionType: "fee_payment",
    actionLabel: "Pay Fees & Get Receipt",
    commonRequests: [
      "Pay Outstanding Semester Fees",
      "Download Official Fee Receipt",
      "Tuition Fee Installment Request",
      "Financial Hold Removal",
      "Scholarship Status Inquiry",
    ],
    location: "Administration Tower, Ground Floor",
    hours: "Mon - Thu, 9:00 AM - 5:00 PM",
    contact: "bursar@university.edu | (555) 019-4402",
    icon: "Banknote",
    badge: "Active Dues",
  },
  {
    id: "exams-grading",
    title: "Examinations & Hall Ticket Cell",
    category: "Academic",
    department: "Controller of Examinations",
    description: "Download verified exam hall tickets, view semester exam schedules, seating allocations, and apply for re-evaluations.",
    actionType: "hall_ticket",
    actionLabel: "Download Hall Ticket",
    commonRequests: [
      "Download Exam Hall Ticket",
      "Examination Schedule Conflict",
      "Grade Card Attestation",
      "Paper Re-evaluation Application",
      "Supplementary Exam Registration",
    ],
    location: "Examination Wing, Block B",
    hours: "Mon - Fri, 9:00 AM - 5:00 PM",
    contact: "exams@university.edu | (555) 019-5512",
    icon: "ClipboardList",
    badge: "Exams Near",
  },
  {
    id: "registrar-records",
    title: "Registrar & Student Records",
    category: "Registrar",
    department: "Office of the University Registrar",
    description: "Instant generation of Bonafide Certificates, enrollment verification letters for visas/loans, official transcripts, and degree verification.",
    actionType: "bonafide_certificate",
    actionLabel: "Request Certificate",
    commonRequests: [
      "Instant Bonafide Certificate",
      "Enrollment Verification Letter",
      "Official Transcript Order",
      "Name / Demographic Correction",
      "Duplicate Student ID Card",
    ],
    location: "Student Services Center, Room 102",
    hours: "Mon - Fri, 9:00 AM - 4:30 PM",
    contact: "registrar@university.edu | (555) 019-1120",
    icon: "FileText",
    badge: "Instant Service",
  },
  {
    id: "academic-advising",
    title: "Academic Advising & Courses",
    category: "Academic",
    department: "Office of Academic Affairs",
    description: "Course enrollment, elective selections, add/drop requests, prerequisite waivers, and 1-on-1 academic faculty consultations.",
    actionType: "academic_advising",
    actionLabel: "Book Advising / Add-Drop",
    commonRequests: [
      "Add / Drop Course Request",
      "Faculty Advisor Appointment",
      "Elective Selection Consultation",
      "Prerequisite Waiver Request",
      "Degree Audit & Credit Evaluation",
    ],
    location: "Academic Hall, Suite 302",
    hours: "Mon - Fri, 8:30 AM - 4:30 PM",
    contact: "advising@university.edu | (555) 019-2831",
    icon: "GraduationCap",
    badge: "Core Service",
  },
  {
    id: "it-services",
    title: "Campus IT & Digital Services",
    category: "Technology",
    department: "Division of Information Technology",
    description: "Student portal credentials, high-speed campus Wi-Fi device registration, lab access, software licenses, and cloud resources.",
    actionType: "it_support",
    actionLabel: "Wi-Fi & Account Access",
    commonRequests: [
      "Campus Wi-Fi Device MAC Registration",
      "Student Account Password Reset",
      "Software License Activation (MATLAB/Office)",
      "Campus Email Support",
      "Computer Lab Access Card Issue",
    ],
    location: "Technology Center, 2nd Floor",
    hours: "Mon - Sat, 8:00 AM - 8:00 PM",
    contact: "it-helpdesk@university.edu | (555) 019-4357",
    icon: "Laptop",
    badge: "Fast Resolution",
  },
  {
    id: "housing-residence",
    title: "Hostel & Residential Life",
    category: "Facilities",
    department: "Office of Campus Housing",
    description: "Room maintenance requests (electrical/plumbing), hostel leave gatepasses, room change applications, and hostel fee clearances.",
    actionType: "hostel_service",
    actionLabel: "Hostel Pass & Maintenance",
    commonRequests: [
      "Hostel Leave Gatepass Request",
      "Room Maintenance (Plumbing/Electrical)",
      "Room Change Application",
      "Hostel Fee Clearance",
      "Late Night Campus Entry Pass",
    ],
    location: "Student Union, Ground Floor",
    hours: "Mon - Sun, 8:00 AM - 7:00 PM (Wardens 24/7)",
    contact: "housing@university.edu | (555) 019-7666",
    icon: "Home",
  },
  {
    id: "library-services",
    title: "University Library & Archives",
    category: "Library",
    department: "University Library Network",
    description: "Book reservations, digital research journals access, study room bookings, research assistance, and overdue clearance.",
    actionType: "library_service",
    actionLabel: "Reserve Book / Study Room",
    commonRequests: [
      "Reserve Reference Book",
      "Book Renewal & Fine Clearance",
      "IEEE / ACM Digital Library Access",
      "Group Study Room Reservation",
      "Inter-Library Loan Request",
    ],
    location: "Central Library, 4 Floors",
    hours: "Mon - Sun, 7:30 AM - 11:00 PM (Exams: 24/7)",
    contact: "library@university.edu | (555) 019-3388",
    icon: "BookOpen",
    badge: "24/7 Study Mode",
  },
  {
    id: "health-wellness",
    title: "Student Health & Wellness Clinic",
    category: "Health",
    department: "Student Health Center",
    description: "Confidential medical appointments, first aid, mental health counseling, medical leave certification, and emergency support.",
    actionType: "health_clinic",
    actionLabel: "Book Clinic / Medical Leave",
    commonRequests: [
      "Doctor Appointment Booking",
      "Confidential Counseling Session",
      "Medical Leave Certificate Submission",
      "Prescription Refill",
      "Emergency First Aid Support",
    ],
    location: "Health Pavilion, East Campus",
    hours: "Mon - Fri, 8:00 AM - 6:00 PM (Ambulance 24/7)",
    contact: "health@university.edu | (555) 019-9911",
    icon: "HeartPulse",
  },
  {
    id: "career-placement",
    title: "Career Development & Internships",
    category: "Career",
    department: "Career Placement Cell",
    description: "Campus recruitment drives, internship approvals, No Objection Certificates (NOC), resume reviews, and mock interview slots.",
    actionType: "career_noc",
    actionLabel: "Request Internship NOC",
    commonRequests: [
      "Internship No Objection Certificate (NOC)",
      "Campus Placement Drive Registration",
      "Resume Review Appointment",
      "Summer Internship Credit Approval",
      "Alumni Mentorship Connect",
    ],
    location: "Career Center, Tower 3",
    hours: "Mon - Fri, 9:00 AM - 5:00 PM",
    contact: "careers@university.edu | (555) 019-6644",
    icon: "Briefcase",
    badge: "Placements Live",
  },
];

// ============================================================================
// DETERMINISTIC PSEUDORANDOM GENERATOR ENGINE (PER EMAIL)
// ============================================================================

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededFloat(seed: number, offset = 0): number {
  const x = Math.sin(seed + offset * 9973) * 10000;
  return x - Math.floor(x);
}

function seededInt(seed: number, min: number, max: number, offset = 0): number {
  const f = seededFloat(seed, offset);
  return Math.floor(f * (max - min + 1)) + min;
}

// 5 Distinct Academic Majors
interface ProgramDef {
  name: string;
  school: string;
  courses: {
    code: string;
    name: string;
    type: "Theory" | "Practical" | "Tutorial";
    faculty: string;
    credits: number;
  }[];
}

const ACADEMIC_PROGRAMS: ProgramDef[] = [
  {
    name: "B.Tech in Computer Science & Engineering (Honors)",
    school: "School of Computing & Information Technologies",
    courses: [
      { code: "CS-401", name: "Distributed Cloud Systems & Microservices", type: "Theory", faculty: "Prof. Alexander Thorne", credits: 4 },
      { code: "CS-402", name: "Artificial Intelligence & Autonomous Systems", type: "Theory", faculty: "Dr. Elena Rostova", credits: 4 },
      { code: "CS-403", name: "Advanced Algorithms & Quantitative Methods", type: "Theory", faculty: "Dr. Marcus Vance", credits: 4 },
      { code: "CS-404", name: "Cloud Systems Implementation Lab", type: "Practical", faculty: "Dr. Robert Sterling", credits: 4 },
      { code: "CS-405", name: "Deep Learning & AI Laboratory", type: "Practical", faculty: "Dr. Elena Rostova", credits: 4 },
      { code: "CS-406", name: "Cybersecurity, Ethics & Digital Privacy", type: "Theory", faculty: "Prof. Samantha Hayes", credits: 4 },
    ],
  },
  {
    name: "B.Tech in Artificial Intelligence & Data Science",
    school: "Department of AI & Data Intelligence",
    courses: [
      { code: "AI-401", name: "Deep Neural Architectures & Transformer Models", type: "Theory", faculty: "Dr. Julian Sterling", credits: 4 },
      { code: "AI-402", name: "Big Data Systems & Distributed Analytics", type: "Theory", faculty: "Prof. Catherine Myers", credits: 4 },
      { code: "AI-403", name: "Computer Vision & Visual Intelligence", type: "Theory", faculty: "Dr. Liam Gallagher", credits: 4 },
      { code: "AI-404", name: "MLOps & Cloud Pipeline Implementation Lab", type: "Practical", faculty: "Prof. David K. Miller", credits: 4 },
      { code: "AI-405", name: "Natural Language Processing Laboratory", type: "Practical", faculty: "Dr. Julian Sterling", credits: 4 },
      { code: "AI-406", name: "Responsible AI, Ethics & Data Governance", type: "Theory", faculty: "Prof. Sarah Mitchell", credits: 4 },
    ],
  },
  {
    name: "B.Tech in Cybersecurity & Information Assurance",
    school: "School of Cyber Defense & Digital Forensics",
    courses: [
      { code: "SEC-401", name: "Advanced Network Penetration & Defense", type: "Theory", faculty: "Dr. Nathan Drake", credits: 4 },
      { code: "SEC-402", name: "Applied Cryptography & Zero-Knowledge Proofs", type: "Theory", faculty: "Prof. Clara Oswald", credits: 4 },
      { code: "SEC-403", name: "Cloud Infrastructure Security & Incident Response", type: "Theory", faculty: "Dr. Robert Sterling", credits: 4 },
      { code: "SEC-404", name: "Security Operations Center (SOC) Lab", type: "Practical", faculty: "Prof. Alexander Thorne", credits: 4 },
      { code: "SEC-405", name: "Binary Exploitation & Malware Analysis Lab", type: "Practical", faculty: "Dr. Nathan Drake", credits: 4 },
      { code: "SEC-406", name: "Digital Forensics & International Cyber Law", type: "Theory", faculty: "Prof. Samantha Hayes", credits: 4 },
    ],
  },
  {
    name: "B.Tech in Software Engineering & Cloud Computing",
    school: "School of Computing & Information Technologies",
    courses: [
      { code: "SE-401", name: "Scalable Microservices & Kubernetes Architecture", type: "Theory", faculty: "Prof. Alexander Thorne", credits: 4 },
      { code: "SE-402", name: "Modern Web Frameworks & Distributed State", type: "Theory", faculty: "Dr. Alicia Reynolds", credits: 4 },
      { code: "SE-403", name: "Software Verification, QA & Automated Testing", type: "Theory", faculty: "Dr. Marcus Vance", credits: 4 },
      { code: "SE-404", name: "Enterprise Cloud & CI/CD Pipeline Lab", type: "Practical", faculty: "Prof. David K. Miller", credits: 4 },
      { code: "SE-405", name: "Full Stack Application Engineering Lab", type: "Practical", faculty: "Dr. Alicia Reynolds", credits: 4 },
      { code: "SE-406", name: "Agile Leadership & Systems Architecture", type: "Theory", faculty: "Prof. Catherine Myers", credits: 4 },
    ],
  },
  {
    name: "B.Tech in Robotics & Autonomous Systems",
    school: "Institute of Mechatronics & Autonomous Robotics",
    courses: [
      { code: "ROB-401", name: "Embedded Computing & Real-Time Operating Systems", type: "Theory", faculty: "Dr. Harrison Ford", credits: 4 },
      { code: "ROB-402", name: "Robot Kinematics, Dynamics & Motion Planning", type: "Theory", faculty: "Prof. Arthur Pendelton", credits: 4 },
      { code: "ROB-403", name: "Autonomous Navigation, SLAM & Sensor Fusion", type: "Theory", faculty: "Dr. Elena Rostova", credits: 4 },
      { code: "ROB-404", name: "Robotics Hardware Simulation & ROS Lab", type: "Practical", faculty: "Dr. Harrison Ford", credits: 4 },
      { code: "ROB-405", name: "Autonomous Vehicles & Actuators Lab", type: "Practical", faculty: "Prof. Arthur Pendelton", credits: 4 },
      { code: "ROB-406", name: "Industrial Automation & Safety Systems", type: "Theory", faculty: "Prof. Samantha Hayes", credits: 4 },
    ],
  },
];

// ============================================================================
// 1. DYNAMIC STUDENT PROFILE
// ============================================================================

export interface StudentProfile {
  name: string;
  enrollmentNo: string;
  institution: string;
  program: string;
  semester: string;
  section: string;
  gender: string;
  dob: string;
  email: string;
  phone: string;
  cgpa: string;
  status: "Good Standing" | "Probation" | "Dean's List";
}

export function getDynamicStudentProfile(email?: string): StudentProfile {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);

  // Name derivation: split user prefix or clean formatted name
  const userPrefix = cleanEmail.split("@")[0];
  const formattedName = userPrefix
    .split(/[._-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Deterministic attributes
  const rollSuffix = (10000 + (seed % 89999)).toString();
  const rollNo = `STU-2026-${rollSuffix}`;

  const progIdx = seed % ACADEMIC_PROGRAMS.length;
  const program = ACADEMIC_PROGRAMS[progIdx];

  const semesters = ["Semester 4 (Spring 2026)", "Semester 6 (Spring 2026)", "Semester 7 (Fall 2026)"];
  const semester = semesters[seededInt(seed, 0, semesters.length - 1, 1)];

  const sections = ["Section A", "Section B", "Section C"];
  const section = sections[seededInt(seed, 0, sections.length - 1, 2)];

  // CGPA between 3.35 and 3.96
  const cgpaNum = 3.35 + seededFloat(seed, 3) * 0.61;
  const cgpa = cgpaNum.toFixed(2);
  const status = cgpaNum >= 3.75 ? "Dean's List" : "Good Standing";

  const birthDay = (seededInt(seed, 1, 28, 4)).toString().padStart(2, "0");
  const birthMonth = (seededInt(seed, 1, 12, 5)).toString().padStart(2, "0");
  const birthYear = seededInt(seed, 2003, 2005, 6);
  const dob = `${birthDay}-${birthMonth}-${birthYear}`;

  const phoneSuffix = seededInt(seed, 100000, 999999, 7);
  const phone = `+1 (555) 019-${phoneSuffix.toString().slice(0, 4)}`;

  return {
    name: formattedName || "Student Scholar",
    enrollmentNo: rollNo,
    institution: program.school,
    program: program.name,
    semester,
    section,
    gender: seed % 2 === 0 ? "Male" : "Female",
    dob,
    email: cleanEmail,
    phone,
    cgpa,
    status,
  };
}

// ============================================================================
// 2. DYNAMIC ATTENDANCE DATA
// ============================================================================

export interface AttendanceSubjectRecord {
  code: string;
  name: string;
  theory: {
    total: number;
    p: number;
    a: number;
    l: number;
    pct: string | null;
  };
  practical: {
    total: number;
    p: number;
    a: number;
    l: number;
    pct: string | null;
  };
  overallPct: string;
}

export interface AttendanceSummary {
  overallPercentage: string;
  asOf: string;
  records: AttendanceSubjectRecord[];
  totals: {
    theoryTotal: number;
    theoryP: number;
    theoryA: number;
    theoryL: number;
    theoryPct: string;
    practicalTotal: number;
    practicalP: number;
    practicalA: number;
    practicalL: number;
    practicalPct: string;
    overallPct: string;
  };
}

export function getDynamicAttendanceData(email?: string): AttendanceSummary {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);
  const progIdx = seed % ACADEMIC_PROGRAMS.length;
  const program = ACADEMIC_PROGRAMS[progIdx];

  // Base student attendance affinity (e.g. 78% to 94%)
  const baseRate = 0.78 + seededFloat(seed, 10) * 0.16;

  let totalTheoryCount = 0;
  let totalTheoryP = 0;
  let totalPracticalCount = 0;
  let totalPracticalP = 0;

  const records: AttendanceSubjectRecord[] = program.courses.map((course, idx) => {
    // Subject specific variation (+/- 6%)
    const subjectVariance = (seededFloat(seed, 20 + idx) - 0.5) * 0.12;
    const rate = Math.min(0.98, Math.max(0.68, baseRate + subjectVariance));

    if (course.type === "Theory") {
      const total = 40 + seededInt(seed, 0, 6, 30 + idx);
      const p = Math.round(total * rate);
      const a = total - p;
      totalTheoryCount += total;
      totalTheoryP += p;
      const pctStr = ((p / total) * 100).toFixed(2);
      return {
        code: course.code,
        name: course.name,
        theory: { total, p, a, l: 0, pct: pctStr },
        practical: { total: 0, p: 0, a: 0, l: 0, pct: null },
        overallPct: pctStr,
      };
    } else {
      const total = 36 + seededInt(seed, 0, 6, 30 + idx);
      const p = Math.round(total * rate);
      const a = total - p;
      totalPracticalCount += total;
      totalPracticalP += p;
      const pctStr = ((p / total) * 100).toFixed(2);
      return {
        code: course.code,
        name: course.name,
        theory: { total: 0, p: 0, a: 0, l: 0, pct: null },
        practical: { total, p, a, l: 0, pct: pctStr },
        overallPct: pctStr,
      };
    }
  });

  const theoryPctNum = totalTheoryCount > 0 ? (totalTheoryP / totalTheoryCount) * 100 : 0;
  const practicalPctNum = totalPracticalCount > 0 ? (totalPracticalP / totalPracticalCount) * 100 : 0;
  const grandTotal = totalTheoryCount + totalPracticalCount;
  const grandP = totalTheoryP + totalPracticalP;
  const overallPctNum = grandTotal > 0 ? (grandP / grandTotal) * 100 : 0;

  return {
    overallPercentage: overallPctNum.toFixed(2),
    asOf: "Updated Today",
    records,
    totals: {
      theoryTotal: totalTheoryCount,
      theoryP: totalTheoryP,
      theoryA: totalTheoryCount - totalTheoryP,
      theoryL: 0,
      theoryPct: theoryPctNum.toFixed(2),
      practicalTotal: totalPracticalCount,
      practicalP: totalPracticalP,
      practicalA: totalPracticalCount - totalPracticalP,
      practicalL: 0,
      practicalPct: practicalPctNum.toFixed(2),
      overallPct: overallPctNum.toFixed(2),
    },
  };
}

// ============================================================================
// 3. DYNAMIC FEE INVOICE & RECEIPT HISTORY
// ============================================================================

export interface FeeInvoice {
  invoiceNo: string;
  term: string;
  totalDue: number;
  currency: string;
  dueDate: string;
  isPaid: boolean;
  items: {
    description: string;
    amount: number;
    category: string;
  }[];
}

export function getDynamicFeeInvoice(email?: string): FeeInvoice {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);

  const invSuffix = (1000 + (seed % 8999)).toString();
  const invoiceNo = `INV-2026-${invSuffix}`;

  // Deterministic dues status:
  // 0 -> Paid in full (totalDue = 0)
  // 1 -> Standard semester dues (1,500)
  // 2 -> Lab & Assessment dues (2,850)
  // 3 -> Tuition balance installment (12,500)
  const dueVariant = seed % 4;

  if (dueVariant === 0) {
    return {
      invoiceNo,
      term: "Spring Semester 2026",
      totalDue: 0,
      currency: "₹",
      dueDate: "Paid & Verified",
      isPaid: true,
      items: [
        { description: "Semester Tuition Fee (Cleared via Online NetBanking)", amount: 27500, category: "Tuition" },
        { description: "Laboratory & Technology Fee (Cleared)", amount: 1500, category: "Technology Fee" },
      ],
    };
  }

  if (dueVariant === 1) {
    return {
      invoiceNo,
      term: "Spring Semester 2026",
      totalDue: 1500,
      currency: "₹",
      dueDate: "October 15, 2026",
      isPaid: false,
      items: [
        { description: "Laboratory & Cloud Infrastructure Usage Charge", amount: 850, category: "Technology Fee" },
        { description: "University Examination & Assessment Fee", amount: 450, category: "Exam Cell" },
        { description: "Student Activity & Professional Development Fund", amount: 200, category: "Student Life" },
      ],
    };
  }

  if (dueVariant === 2) {
    return {
      invoiceNo,
      term: "Spring Semester 2026",
      totalDue: 2850,
      currency: "₹",
      dueDate: "October 20, 2026",
      isPaid: false,
      items: [
        { description: "Advanced Specialized Lab & Cloud Computing Credit", amount: 1800, category: "Laboratory" },
        { description: "Mid-Term Examination & Assessment Charge", amount: 650, category: "Exam Cell" },
        { description: "Campus Health Center & Student Sports Facility", amount: 400, category: "Facilities" },
      ],
    };
  }

  return {
    invoiceNo,
    term: "Spring Semester 2026",
    totalDue: 12500,
    currency: "₹",
    dueDate: "November 05, 2026",
    isPaid: false,
    items: [
      { description: "Semester Tuition Fee Installment (2nd Phase)", amount: 10000, category: "Tuition" },
      { description: "High-Performance Computing & Lab Usage", amount: 2000, category: "Technology Fee" },
      { description: "University Library Access & Electronic Journals", amount: 500, category: "Library" },
    ],
  };
}

export interface FeeReceiptRecord {
  id: string;
  academicYear: string;
  semester: string;
  receiptDate: string;
  receiptNo: string;
  amount: number;
  paymentType: "ONLINE PAYMENT" | "CHEQUE" | "NET BANKING";
}

export function getDynamicFeeReceipts(email?: string): FeeReceiptRecord[] {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);

  const pastSemesters = [
    { year: "2026-2027", sem: "Semester 7", date: "14/07/2026 08:30 PM", amt: 27500, mode: "ONLINE PAYMENT" as const },
    { year: "2025-2026", sem: "Semester 6", date: "16/01/2026 09:15 AM", amt: 27500, mode: "ONLINE PAYMENT" as const },
    { year: "2025-2026", sem: "Semester 5", date: "18/07/2025 04:20 PM", amt: 1500, mode: "ONLINE PAYMENT" as const },
    { year: "2025-2026", sem: "Semester 5", date: "12/07/2025 06:10 PM", amt: 27500, mode: "ONLINE PAYMENT" as const },
    { year: "2024-2025", sem: "Semester 4", date: "17/01/2025 07:45 PM", amt: 27500, mode: "ONLINE PAYMENT" as const },
    { year: "2024-2025", sem: "Semester 3", date: "20/07/2024 11:30 AM", amt: 1500, mode: "NET BANKING" as const },
    { year: "2024-2025", sem: "Semester 3", date: "19/07/2024 02:40 PM", amt: 27500, mode: "ONLINE PAYMENT" as const },
    { year: "2023-2024", sem: "Semester 2", date: "21/01/2024 06:50 PM", amt: 27500, mode: "ONLINE PAYMENT" as const },
    { year: "2023-2024", sem: "Semester 1", date: "10/01/2024 01:21 PM", amt: 1500, mode: "ONLINE PAYMENT" as const },
    { year: "2023-2024", sem: "Semester 1", date: "13/07/2023 04:44 PM", amt: 10000, mode: "CHEQUE" as const },
  ];

  return pastSemesters.map((p, idx) => {
    const num = (10000 + ((seed + idx * 8311) % 89999)).toString();
    return {
      id: `r-${idx + 1}-${num}`,
      academicYear: p.year,
      semester: p.sem,
      receiptDate: p.date,
      receiptNo: `REC-2026-${num}`,
      amount: p.amt,
      paymentType: p.mode,
    };
  });
}

// ============================================================================
// 4. DYNAMIC PROVISIONAL EXAM RESULTS & MARKSHEETS
// ============================================================================

export interface ExamSubjectResult {
  code: string;
  name: string;
  credits: number;
  grade: string;
  gradePoints: number;
}

export interface SemesterExamResult {
  examName: string;
  semester: string;
  academicYear: string;
  spi: string;
  cpi: string;
  totalCredits: number;
  earnedCredits: number;
  resultStatus: "PASS" | "FAIL" | "PENDING";
  declarationDate: string;
  subjects: ExamSubjectResult[];
}

export function getDynamicExamResultsMap(email?: string): Record<string, SemesterExamResult> {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);
  const progIdx = seed % ACADEMIC_PROGRAMS.length;
  const program = ACADEMIC_PROGRAMS[progIdx];

  // Base SPI/CPI correlated with student CGPA
  const profile = getDynamicStudentProfile(cleanEmail);
  const baseCpi = parseFloat(profile.cgpa) * 2.3; // Convert 4.0 scale to 10.0 scale approx 8.0-9.2

  const gradePool = [
    { grade: "AA", points: 10 },
    { grade: "AB", points: 9 },
    { grade: "BB", points: 8 },
    { grade: "BC", points: 7 },
  ];

  const semConfigs = [
    { id: "sem-6-winter-2025", term: "Sem-VI Regular Spring 2026", semLabel: "Semester VI", year: "2025-2026", date: "24/02/2026" },
    { id: "sem-5-winter-2025", term: "Sem-V Regular Fall 2025", semLabel: "Semester V", year: "2025-2026", date: "15/08/2025" },
    { id: "sem-4-summer-2024", term: "Sem-IV Regular Spring 2025", semLabel: "Semester IV", year: "2024-2025", date: "20/06/2025" },
    { id: "sem-3-winter-2024", term: "Sem-III Regular Fall 2024", semLabel: "Semester III", year: "2024-2025", date: "12/01/2025" },
    { id: "sem-2-summer-2023", term: "Sem-II Regular Spring 2024", semLabel: "Semester II", year: "2023-2024", date: "18/06/2024" },
    { id: "sem-1-winter-2023", term: "Sem-I Regular Fall 2023", semLabel: "Semester I", year: "2023-2024", date: "10/01/2024" },
  ];

  const result: Record<string, SemesterExamResult> = {};

  semConfigs.forEach((cfg, sIdx) => {
    // Generate subjects with tailored grades
    let totalPoints = 0;
    let totalCredits = 0;

    const subjects: ExamSubjectResult[] = program.courses.map((course, cIdx) => {
      // Pick grade deterministically based on seed + sem + course
      const pickScore = seededFloat(seed, sIdx * 10 + cIdx);
      let gIndex = 1; // Default AB
      if (pickScore > 0.6) gIndex = 0; // AA
      else if (pickScore < 0.2) gIndex = 2; // BB

      const g = gradePool[gIndex];
      const credits = course.credits || 4;
      totalCredits += credits;
      totalPoints += credits * g.points;

      return {
        code: `${course.code}-${sIdx + 1}`,
        name: course.name,
        credits,
        grade: g.grade,
        gradePoints: g.points,
      };
    });

    const calculatedSpi = (totalPoints / totalCredits).toFixed(2);
    const calculatedCpi = Math.min(9.85, Math.max(7.2, baseCpi + (seededFloat(seed, sIdx + 70) - 0.5) * 0.4)).toFixed(2);

    result[cfg.id] = {
      examName: `${program.name} - ${cfg.term}`,
      semester: cfg.semLabel,
      academicYear: cfg.year,
      spi: calculatedSpi,
      cpi: calculatedCpi,
      totalCredits,
      earnedCredits: totalCredits,
      resultStatus: "PASS",
      declarationDate: cfg.date,
      subjects,
    };
  });

  return result;
}

// ============================================================================
// 5. DYNAMIC TIMETABLE SCHEDULE
// ============================================================================

export interface TimetableSlot {
  lectureNo: number;
  period: string;
  roomNo: string;
  time: string;
  subjectCode: string;
  subjectName: string;
  type: "Theory" | "Practical" | "Tutorial";
  faculty: string;
}

export function getDynamicWeeklyTimetable(email?: string): Record<string, TimetableSlot[]> {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);
  const progIdx = seed % ACADEMIC_PROGRAMS.length;
  const program = ACADEMIC_PROGRAMS[progIdx];

  const profile = getDynamicStudentProfile(cleanEmail);
  const roomBase = 100 + (seed % 400);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timetable: Record<string, TimetableSlot[]> = {};

  days.forEach((day, dIdx) => {
    // Reorder courses slightly per day for realistic variety
    const c1 = program.courses[(dIdx + 0) % program.courses.length];
    const c2 = program.courses[(dIdx + 1) % program.courses.length];
    const c3 = program.courses[(dIdx + 2) % program.courses.length];
    const c4 = program.courses[(dIdx + 3) % program.courses.length];
    const labCourse = program.courses.find((c) => c.type === "Practical") || program.courses[3];

    timetable[day] = [
      {
        lectureNo: 1,
        period: "Period 1",
        roomNo: `Lecture Hall ${roomBase + 1}`,
        time: "08:30 AM - 09:30 AM",
        subjectCode: c1.code,
        subjectName: c1.name,
        type: c1.type,
        faculty: c1.faculty,
      },
      {
        lectureNo: 2,
        period: "Period 2",
        roomNo: `Turing Hall ${roomBase + 2}`,
        time: "09:35 AM - 10:35 AM",
        subjectCode: c2.code,
        subjectName: c2.name,
        type: c2.type,
        faculty: c2.faculty,
      },
      {
        lectureNo: 3,
        period: "Period 3",
        roomNo: `Science Block Room ${roomBase + 3}`,
        time: "10:55 AM - 11:55 AM",
        subjectCode: c3.code,
        subjectName: c3.name,
        type: c3.type,
        faculty: c3.faculty,
      },
      {
        lectureNo: 4,
        period: "Period 4",
        roomNo: `Auditorium ${roomBase + 4}`,
        time: "12:00 PM - 01:00 PM",
        subjectCode: c4.code,
        subjectName: c4.name,
        type: c4.type,
        faculty: c4.faculty,
      },
      {
        lectureNo: 5,
        period: "Lab Block",
        roomNo: `Specialized Lab ${1 + (seed % 4)}`,
        time: "02:00 PM - 04:00 PM",
        subjectCode: labCourse.code,
        subjectName: labCourse.name,
        type: "Practical",
        faculty: labCourse.faculty,
      },
      {
        lectureNo: 6,
        period: "Mentorship",
        roomNo: `Faculty Suite ${roomBase}`,
        time: "04:05 PM - 04:50 PM",
        subjectCode: "SEM-499",
        subjectName: `Faculty Office Hours & Research Advising (${profile.section})`,
        type: "Tutorial",
        faculty: c1.faculty,
      },
    ];
  });

  return timetable;
}

// ============================================================================
// 6. DYNAMIC DATEWISE ATTENDANCE
// ============================================================================

export interface DatewiseLectureAttendance {
  lectureNo: number;
  time: string;
  subjectCode: string;
  subjectName: string;
  type: "Theory" | "Practical" | "Tutorial";
  faculty: string;
  status: "Present" | "Absent" | "Leave" | "Not Marked";
}

export function getDynamicDatewiseAttendance(email?: string, dateStr?: string): DatewiseLectureAttendance[] {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);
  const progIdx = seed % ACADEMIC_PROGRAMS.length;
  const program = ACADEMIC_PROGRAMS[progIdx];

  const dateSeed = dateStr ? hashString(dateStr) : 0;
  const isToday = dateStr === "2026-09-10";

  return program.courses.map((course, idx) => {
    const timeSlots = [
      "08:30 AM - 09:30 AM",
      "09:35 AM - 10:35 AM",
      "10:55 AM - 11:55 AM",
      "12:00 PM - 01:00 PM",
      "02:00 PM - 03:00 PM",
      "03:05 PM - 04:05 PM",
    ];

    let status: "Present" | "Absent" | "Leave" | "Not Marked" = "Not Marked";
    if (!isToday) {
      // Deterministically mark present or absent based on student seed + date + slot
      const roll = seededFloat(seed + dateSeed, idx);
      status = roll > 0.18 ? "Present" : "Absent";
    }

    return {
      lectureNo: idx + 1,
      time: timeSlots[idx] || "04:10 PM - 05:00 PM",
      subjectCode: course.code,
      subjectName: `${course.code}: ${course.name}`,
      type: course.type,
      faculty: course.faculty,
      status,
    };
  });
}

// ============================================================================
// 7. DYNAMIC HALL TICKET
// ============================================================================

export interface HallTicketData {
  examSession: string;
  studentName: string;
  enrollmentNo: string;
  centerName: string;
  centerCode: string;
  papers: {
    code: string;
    name: string;
    date: string;
    time: string;
    room: string;
    type: "Theory" | "Practical";
  }[];
  instructions: string[];
}

export function getDynamicHallTicket(email?: string): HallTicketData {
  const cleanEmail = (email || "student1@example.com").toLowerCase().trim();
  const seed = hashString(cleanEmail);
  const profile = getDynamicStudentProfile(cleanEmail);
  const progIdx = seed % ACADEMIC_PROGRAMS.length;
  const program = ACADEMIC_PROGRAMS[progIdx];

  const centerNum = 1 + (seed % 5);
  const roomBase = 100 + (seed % 300);

  const dates = ["Oct 24, 2026", "Oct 27, 2026", "Oct 30, 2026", "Nov 03, 2026", "Nov 06, 2026", "Nov 09, 2026"];

  const papers = program.courses.map((course, idx) => ({
    code: course.code,
    name: course.name,
    date: dates[idx] || "Nov 12, 2026",
    time: course.type === "Practical" ? "02:00 PM - 05:00 PM" : "10:00 AM - 01:00 PM",
    room: course.type === "Practical" ? `Lab ${centerNum}` : `Hall ${roomBase + idx}`,
    type: course.type === "Practical" ? ("Practical" as const) : ("Theory" as const),
  }));

  return {
    examSession: `${profile.semester} Regular End-Semester Examinations`,
    studentName: profile.name,
    enrollmentNo: profile.enrollmentNo,
    centerName: `${program.school} — Examination Complex (Block ${String.fromCharCode(65 + (seed % 4))})`,
    centerCode: `CAMPUS-CTR-0${centerNum}`,
    papers,
    instructions: [
      "Candidates must bring this original Hall Ticket along with their University Student ID Card.",
      "Entry into the examination hall is strictly prohibited after 15 minutes of commencement.",
      "Mobile phones, smart watches, and unauthorized electronic devices are strictly prohibited.",
      "Write your Enrollment Number accurately on the front page of the main answer booklet.",
    ],
  };
}

// Static backwards-compatible exports for any components importing constants directly
export const ATTENDANCE_DATA = getDynamicAttendanceData();
export const CURRENT_FEE_INVOICE = getDynamicFeeInvoice();
export const FEE_RECEIPTS_HISTORY = getDynamicFeeReceipts();
export const EXAM_RESULTS_MAP = getDynamicExamResultsMap();
export const WEEKLY_TIMETABLE = getDynamicWeeklyTimetable();
export const TIMETABLE_SLOTS = WEEKLY_TIMETABLE["Thursday"];
export const DATEWISE_ATTENDANCE_SCHEDULE = getDynamicDatewiseAttendance();
export const SAMPLE_HALL_TICKET = getDynamicHallTicket();

export interface CampusAnnouncement {
  id: string;
  title: string;
  date: string;
  category: string;
  urgent?: boolean;
}

export const CAMPUS_ANNOUNCEMENTS: CampusAnnouncement[] = [
  {
    id: "a1",
    title: "Fall 2026 End-Semester Examination Hall Tickets Available for Download",
    date: "1 hour ago",
    category: "Examination",
    urgent: true,
  },
  {
    id: "a2",
    title: "Last date for Semester Fee Payment without late fee: October 15",
    date: "1 day ago",
    category: "Financial Aid",
    urgent: true,
  },
  {
    id: "a3",
    title: "Campus Wi-Fi 6 upgrade completed — Re-register your devices via IT Services",
    date: "2 days ago",
    category: "IT Support",
  },
  {
    id: "a4",
    title: "Annual University Innovation & Hackathon registration now open",
    date: "4 days ago",
    category: "Campus Events",
  },
];
