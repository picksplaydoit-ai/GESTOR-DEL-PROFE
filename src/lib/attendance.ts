import { AttendanceStatus } from '../types';

export interface AttendanceMetrics {
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  justifiedCount: number;
  attendancePoints: number;
  attendancePercentage: number;
  hasRecords: boolean;
}

/**
 * Calculates attendance metrics for a student based on their records.
 * Rules:
 * - present = 1
 * - justified = 1
 * - late = 0.5
 * - absent = 0
 */
export function calculateStudentAttendance(records: any[]): AttendanceMetrics {
  const metrics: AttendanceMetrics = {
    totalClasses: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    justifiedCount: 0,
    attendancePoints: 0,
    attendancePercentage: 100,
    hasRecords: false
  };

  if (!records || records.length === 0) {
    return metrics;
  }

  metrics.hasRecords = true;
  metrics.totalClasses = records.length;

  records.forEach(record => {
    const status = record.status as AttendanceStatus;
    
    switch (status) {
      case 'present':
        metrics.presentCount++;
        metrics.attendancePoints += 1;
        break;
      case 'justified':
        metrics.justifiedCount++;
        metrics.attendancePoints += 1;
        break;
      case 'late':
        metrics.lateCount++;
        metrics.attendancePoints += 0.5;
        break;
      case 'absent':
        metrics.absentCount++;
        metrics.attendancePoints += 0;
        break;
    }
  });

  if (metrics.totalClasses > 0) {
    metrics.attendancePercentage = (metrics.attendancePoints / metrics.totalClasses) * 100;
  }

  return metrics;
}
