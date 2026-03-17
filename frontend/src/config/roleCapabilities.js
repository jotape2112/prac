export const roleCapabilities = {
  ESTUDIANTE: {
    canUpload: true,
    canViewOwnPractice: true
  },
  ADMIN: {
    canUpdateStatus: true,
    canViewAll: true
  },
  SECRETARIO_ACADEMICO: {
    canUpdateStatus: true,
    canViewAll: true,
    canGenerateReports: true
  },
  DIRECTOR_CARRERA: {
    canViewAll: true,
    canApprovePractice: true
  }
};