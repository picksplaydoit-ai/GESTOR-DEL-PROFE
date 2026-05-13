import { Student, Activity, Submission, RubricCriterion, Rubric, AttendanceStatus } from '../types';

export interface StudentGradeResult {
  student: Student;
  gradesByCriterion: Record<string, number>; // criterionId -> average (0-100)
  activeWeightSum: number;
  weightedScore: number;
  finalGrade: number;
  attendanceTotal: number;
  attendancePresent: number;
  attendancePercentage: number;
  status: 'APROBADO' | 'REPROBADO' | 'SD';
}

export function calculateGrades(
  students: Student[],
  criteria: RubricCriterion[],
  activities: Activity[],
  submissions: Record<string, Submission>, // key: activityId_studentId
  attendanceRecords: Record<string, { status: AttendanceStatus, value: number }[]>, // key: studentId
  rubric: Rubric
): StudentGradeResult[] {
  
  return students.map(student => {
    const gradesByCriterion: Record<string, number> = {};
    let activeWeightSum = 0;
    let weightedScore = 0;

    // 1. Calculate grade per criterion
    criteria.forEach(criterion => {
      const criterionActivities = activities.filter(a => a.criterion_id === criterion.id);
      
      if (criterionActivities.length > 0) {
        // Criterion is ACTIVE
        let totalGrades = 0;
        criterionActivities.forEach(activity => {
          const sub = submissions[`${activity.id}_${student.id}`];
          totalGrades += sub?.grade || 0;
        });

        const criterionAvg = totalGrades / criterionActivities.length;
        gradesByCriterion[criterion.id] = criterionAvg;
        
        activeWeightSum += Number(criterion.weight);
        weightedScore += (criterionAvg * (Number(criterion.weight) / 100));
      }
    });

    // 2. Special Rule Recalculation
    let finalGrade = 0;
    if (activeWeightSum > 0) {
       // Calculation: (weightedScore / (activeWeightSum / 100))
       // This re-scales the active weights to 100%
       finalGrade = (weightedScore / (activeWeightSum / 100));
    }

    // 3. Attendance Calculation
    const studentAttendance = attendanceRecords[student.id] || [];
    const attendanceTotal = studentAttendance.length;
    const attendancePresent = studentAttendance.reduce((sum, r) => sum + r.value, 0);
    const attendancePercentage = attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 100;

    // 4. Status determination
    let status: 'APROBADO' | 'REPROBADO' | 'SD' = 'APROBADO';
    
    if (attendancePercentage < rubric.min_attendance) {
      status = 'SD';
    } else if (finalGrade < rubric.min_grade) {
      status = 'REPROBADO';
    }

    return {
      student,
      gradesByCriterion,
      activeWeightSum,
      weightedScore,
      finalGrade,
      attendanceTotal,
      attendancePresent,
      attendancePercentage,
      status
    };
  });
}
