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
    let weightedSum = 0;

    // 1. Calculate grade per criterion
    criteria.forEach(criterion => {
      const criterionActivities = activities.filter(a => a.criterion_id === criterion.id);
      
      if (criterionActivities.length > 0) {
        // Criterion is ACTIVE if it has at least one activity
        let totalGrades = 0;
        let gradedActivitiesCount = 0;

        criterionActivities.forEach(activity => {
          const sub = submissions[`${activity.id}_${student.id}`];
          // We count all activities in the criterion. 
          // If no submission, it's 0 grade.
          totalGrades += (sub?.grade || 0);
          gradedActivitiesCount++;
        });

        if (gradedActivitiesCount > 0) {
          const criterionAvg = totalGrades / gradedActivitiesCount;
          gradesByCriterion[criterion.id] = criterionAvg;
          
          const weight = Number(criterion.weight) || 0;
          activeWeightSum += weight;
          weightedSum += (criterionAvg * weight);
        }
      }
    });

    // 2. Calculation: (suma_de_rubros_activos_ponderados / suma_de_pesos_activos)
    // Formula: (weightedSum / activeWeightSum)
    // Since criterionAvg is 0-100, the result is 0-100
    let finalGrade = 0;
    if (activeWeightSum > 0) {
       finalGrade = weightedSum / activeWeightSum;
    }

    // 3. Attendance Calculation
    const studentAttendance = attendanceRecords[student.id] || [];
    const attendanceTotal = studentAttendance.length;
    const attendancePresent = studentAttendance.reduce((sum, r) => sum + r.value, 0);
    const attendancePercentage = attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 100;

    // 4. Status determination
    let status: 'APROBADO' | 'REPROBADO' | 'SD' = 'APROBADO';
    
    if (attendancePercentage < (rubric.min_attendance || 80)) {
      status = 'SD';
    } else if (finalGrade < (rubric.min_grade || 60)) {
      status = 'REPROBADO';
    }

    return {
      student,
      gradesByCriterion,
      activeWeightSum,
      weightedScore: weightedSum / 100, // For legacy internal tracking if needed
      finalGrade,
      attendanceTotal,
      attendancePresent,
      attendancePercentage,
      status
    };
  });
}
