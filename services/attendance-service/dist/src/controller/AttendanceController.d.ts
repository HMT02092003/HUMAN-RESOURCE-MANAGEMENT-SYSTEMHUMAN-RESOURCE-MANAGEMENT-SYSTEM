import { Request, Response } from 'express';
export declare const recognizeFace: (req: Request, res: Response) => Promise<void>;
export declare const confirmAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAttendanceStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAttendanceHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=AttendanceController.d.ts.map