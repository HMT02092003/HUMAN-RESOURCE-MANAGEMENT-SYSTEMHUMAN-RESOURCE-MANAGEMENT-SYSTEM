export function recognize_face_from_image(imagePath: string, _connection: any): Promise<RecognizeResult>;
declare namespace _default {
    export { recognize_face_from_image };
}
export default _default;
export type RecognizeResult = {
    success: boolean;
    recognized: boolean;
    message?: string | undefined;
    userId?: number | undefined;
    userInfo?: Object | undefined;
    confidence?: number | undefined;
};
//# sourceMappingURL=recognize.d.ts.map