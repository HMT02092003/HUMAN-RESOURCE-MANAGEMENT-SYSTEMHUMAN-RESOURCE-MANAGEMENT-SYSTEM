import { Request, Response } from 'express';
export declare const confirmAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAttendanceStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAttendanceHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUserAttendanceByMonth: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUserMonthlyStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=AttendanceController.d.ts.map