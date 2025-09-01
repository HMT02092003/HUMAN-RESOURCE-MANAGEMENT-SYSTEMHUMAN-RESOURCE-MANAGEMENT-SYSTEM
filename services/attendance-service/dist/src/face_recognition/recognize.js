export async function recognize_face_from_image(imagePath, _connection) {
    if (!imagePath) {
        return {
            success: false,
            recognized: false,
            message: 'Không có đường dẫn ảnh hợp lệ'
        };
    }
    return {
        success: true,
        recognized: false,
        message: 'Stub nhận diện: Chưa tích hợp AI'
    };
}
export default { recognize_face_from_image };
//# sourceMappingURL=recognize.js.map