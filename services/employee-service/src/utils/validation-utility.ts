import _ from "lodash";

// Custom error class to replace ApiException
export class ValidationException extends Error {
    status: number;
    code: number;

    constructor(code: number, message: string) {
        super(message);
        this.name = "ValidationException";
        this.code = code;
        this.status = 400; // Bad Request status code
    }
}

/**
 * Validate error types and generate appropriate error messages
 * @param {string} errorType Type of validation error
 * @param {{path: string, typeOfField?: string, realType?: string}} data Error data information
 * @returns {{error: boolean, message: string}} Error object with message
 */
export const validateError = (errorType: string, data: { path: string, typeOfField?: string, realType?: string }): { error: boolean, message: string } => {
    let message = "unknown";
    switch (errorType) {
        case "Invalid Type":
            message = `Datatype of ${data.path} is incorrect. Expected: ${data.typeOfField} but got: ${data.realType}`;
            break;
        case "required":
            message = `${data.path} is required. But not found.`;
    }
    return {
        error: true,
        message: message,
    };
};

/**
 * Recursively validate fields against allowed field definitions
 * @param {any} data Data to validate
 * @param {any} allowFields Object of field definitions or string for single type
 * @param {boolean} removeNotAllow Remove fields not in allowFields
 * @param {string} path Current path for nested validation
 * @param {Record<string, any> | null} newData Resulting validated data object
 * @param {boolean} trimStrings Trim whitespace from strings
 * @returns {{error: boolean, message: string, data?: Record<string, any>}} Validation result with error flag, message and validated data
 */
export const validateFields = (
    data: any,
    allowFields: any = {},
    removeNotAllow: boolean = true,
    path: string = "",
    newData: Record<string, any> | null = null,
    trimStrings: boolean = true
): { error: boolean; message: string; data?: Record<string, any> } => {
    const debug = (message: string, ...args: any[]) => {
        // You can enable this for debugging
        // console.log(`[DEBUG] ${message}`, ...args);
    };

    debug("path: ", path);
    debug("data: ", data);
    debug("allowFields: ", allowFields);

    let result: { error: boolean; message: string; data?: Record<string, any> } = {
        error: false,
        message: "OK",
        data: undefined,
    };

    let root = false;
    if (newData === null) {
        root = true;
        newData = removeNotAllow ? {} : { ...data };
    }

    if (typeof allowFields == "string") {
        debug("type is string...");
        let typeOfField = allowFields;
        let isRequired = typeOfField.indexOf("!") !== -1; //kiểm tra dấu ! ở cuối là bắt buộc
        typeOfField = typeOfField.replace(/\!/, ""); //tách lấy kiểu dữ liệu mong muốn
        let isExists = data != null && data !== "";
        if (path[path.length - 1] == ".")
            path = path.substring(0, path.length - 1);

        if (isRequired && !isExists) {
            //nếu field là bắt buộc như lại không tồn tại trong data.
            let error = validateError("required", {
                path,
            });
            debug(error.message);
            return error;
        } else if (isExists) {
            let realType = typeof data;
            let typeAllowed = realType == typeOfField;

            //nếu không đúng kiểu dữ liệu mong muốn, thì cố gắng convert về đúng kiểu.
            if (!typeAllowed) {
                if (typeOfField == "any") {
                    typeAllowed = true;
                    if (newData) {
                        _.set(newData, path, data);
                    }
                } else if (typeOfField == "number") {
                    typeAllowed = !isNaN(Number(data));
                    if (typeAllowed && newData) {
                        _.set(newData, path, Number(data));
                    }
                } else if (typeOfField == "boolean") {
                    if (typeof data == "string") data = data.toLowerCase();
                    typeAllowed = [
                        "true",
                        "false",
                        "1",
                        "0",
                        1,
                        0,
                        true,
                        false,
                    ].includes(data);
                    if (typeAllowed && newData) {
                        _.set(newData, path, ["true", "1", 1, true].includes(data));
                    }
                } else if (typeOfField == "date" || typeOfField == "moment") {
                    typeAllowed = new Date(data).toString() != "Invalid Date";
                    if (typeAllowed && newData) {
                        _.set(newData, path, new Date(data));
                    }
                } else if (typeOfField == "string") {
                    // Apply trimming to string values if trimStrings is enabled
                    const stringValue =
                        typeof data === "string" && trimStrings
                            ? data.trim()
                            : String(data);
                    if (newData) {
                        _.set(newData, path, stringValue);
                    }
                    typeAllowed = true;
                }
            } else if (realType === "string" && trimStrings && newData) {
                // Apply trimming to native string values if trimStrings is enabled
                _.set(newData, path, data.trim());
            } else if (newData) {
                _.set(newData, path, data);
            }
            debug(JSON.stringify({ typeOfField, realType, typeAllowed }));

            if (!typeAllowed) {
                return validateError("Invalid Type", {
                    path,
                    typeOfField,
                    realType,
                });
            }
        } else if (newData) {
            _.unset(newData, path);
        }
    } else {
        //duyệt các key của object.
        for (let fieldName in allowFields) {
            let typeOfField = allowFields[fieldName];
            let fieldValue = data ? data[fieldName] : undefined;

            debug("Loop for check:", fieldName);
            debug("data: ", fieldValue);
            debug("allowFields", allowFields[fieldName]);

            //kiểm tra nếu là array thì đệ quy tiếp vào các element để check
            if (Array.isArray(typeOfField)) {
                if (Array.isArray(fieldValue)) {
                    debug("case 1: check array:");
                    if (fieldValue.length === 0) {
                        if (typeof typeOfField[0] === "object") {
                            fieldValue.push({});
                        } else if (typeof typeOfField[0] === "string" && typeOfField[0].indexOf("!") !== -1) {
                            debug("element is required but array empty");
                            return validateError("required", {
                                path: `${path}${fieldName}`,
                            });
                        }
                    }

                    for (let i in fieldValue) {
                        result = validateFields(
                            fieldValue[i],
                            typeOfField[0],
                            removeNotAllow,
                            `${path}${fieldName}.${i}.`,
                            newData,
                            trimStrings
                        );
                        if (result.error) return result;
                    }
                } else {
                    debug("case 2: check array but data is not array");
                    if (fieldValue == undefined) {
                        result = validateFields(
                            fieldValue,
                            typeOfField[0],
                            removeNotAllow,
                            `${path}${fieldName}[0].`,
                            newData,
                            trimStrings
                        );
                    } else {
                        return validateError("Invalid Type", {
                            path: `${path}${fieldName}`,
                            typeOfField: "array",
                            realType: typeof fieldValue,
                        });
                    }
                }
            } else if (typeof typeOfField == "object") {
                //nếu là là object thì đệ quy vào trong để check tiếp
                debug("case 3: check object:");
                result = validateFields(
                    fieldValue,
                    typeOfField,
                    removeNotAllow,
                    `${path}${fieldName}.`,
                    newData,
                    trimStrings
                );
            } else {
                //nếu là string thì đệ quy để nhảy vào check các phần tử lá
                debug("case 4: check type is string:");
                result = validateFields(
                    fieldValue,
                    typeOfField,
                    removeNotAllow,
                    `${path}${fieldName}`,
                    newData,
                    trimStrings
                );
            }
            if (result.error) {
                return result;
            }
        }
    }
    if (root) {
        return {
            ...result,
            data: newData as Record<string, any>,
        };
    }
    return result;
};

/**
 * Validate data against allowed fields and throw ValidationException if invalid
 * @param {any} data Data to validate
 * @param {any} allowFields Object describing allowed fields and their types
 * @param {{removeNotAllow?: boolean, trimStrings?: boolean}} options Validation options
 * @returns {Record<string, any>} Validated data
 */
export const validate = (
    data: any,
    allowFields: any,
    options?: { removeNotAllow?: boolean, trimStrings?: boolean }
): Record<string, any> => {
    options = options || { removeNotAllow: false, trimStrings: true };
    if (options.trimStrings === undefined) options.trimStrings = true;

    let result = validateFields(
        data,
        allowFields,
        options.removeNotAllow,
        "",
        null,
        options.trimStrings
    );
    if (result.error) {
        throw new ValidationException(9996, result.message);
    }
    return result?.data || {};
};

export default {
    validate,
    validateFields,
    validateError,
    ValidationException
};