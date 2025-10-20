export async function approveMonthlyAttendance(userId: number, month: string, approvedBy: number) {
  console.warn('approveMonthlyAttendance called but approval flow is disabled in this trimmed service.', { userId, month, approvedBy });
  return {
    success: false,
    message: 'Approval flow is disabled in this deployment. This function is a no-op.'
  } as any;
}
