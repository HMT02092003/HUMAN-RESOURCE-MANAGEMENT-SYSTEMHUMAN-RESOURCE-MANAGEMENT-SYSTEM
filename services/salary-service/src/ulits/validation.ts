import _ from 'lodash';

export class ValidationException extends Error {
  code: number;
  status: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'ValidationException';
    this.code = code;
    this.status = 400;
  }
}

const validateError = (errorType: string, data: any) => {
  let message = 'unknown';
  switch (errorType) {
    case 'Invalid Type':
      message = `Datatype of ${data.path} is incorrect. Expected: ${data.typeOfField} but got: ${data.realType}`;
      break;
    case 'required':
      message = `${data.path} is required. But not found.`;
      break;
  }
  return { error: true, message };
};

const validateFields = (
  data: any,
  allowFields: any = {},
  removeNotAllow = true,
  path = '',
  newData: any = null,
  trimStrings = true
) => {
  let result: any = { error: false, message: 'OK' };
  let root = false;
  if (newData === null) {
    root = true;
    newData = removeNotAllow ? {} : { ...(data || {}) };
  }

  if (typeof allowFields === 'string') {
    let typeOfField = allowFields;
    let isRequired = typeOfField.indexOf('!') !== -1;
    typeOfField = typeOfField.replace(/\!/, '');
    let isExists = data != null && data !== '';
    if (path[path.length - 1] === '.') path = path.substring(0, path.length - 1);

    if (isRequired && !isExists) {
      return validateError('required', { path });
    } else if (isExists) {
      let realType = typeof data;
      let typeAllowed = realType == typeOfField;
      if (!typeAllowed) {
        if (typeOfField == 'any') {
          typeAllowed = true;
        } else if (typeOfField == 'number') {
          typeAllowed = !isNaN(Number(data));
          if (typeAllowed && newData) _.set(newData, path, Number(data));
        } else if (typeOfField == 'boolean') {
          if (typeof data == 'string') data = data.toLowerCase();
          typeAllowed = ['true', 'false', '1', '0', 1, 0, true, false].includes(data);
          if (typeAllowed && newData) _.set(newData, path, ['true', '1', 1, true].includes(data));
        } else if (typeOfField == 'date' || typeOfField == 'moment') {
          typeAllowed = new Date(data).toString() != 'Invalid Date';
          if (typeAllowed && newData) _.set(newData, path, new Date(data));
        } else if (typeOfField == 'string') {
          const stringValue = typeof data === 'string' && trimStrings ? data.trim() : String(data);
          if (newData) _.set(newData, path, stringValue);
          typeAllowed = true;
        }
      } else if (realType === 'string' && trimStrings && newData) {
        _.set(newData, path, data.trim());
      } else if (newData) {
        _.set(newData, path, data);
      }
      if (!typeAllowed) return validateError('Invalid Type', { path, typeOfField, realType });
    } else if (newData) {
      _.unset(newData, path);
    }
  } else {
    for (let fieldName in allowFields) {
      let typeOfField = allowFields[fieldName];
      let fieldValue = data ? data[fieldName] : undefined;
      if (Array.isArray(typeOfField)) {
        if (Array.isArray(fieldValue)) {
          if (fieldValue.length === 0) {
            if (typeof typeOfField[0] === 'object') {
              fieldValue.push({});
            } else if (typeof typeOfField[0] === 'string' && typeOfField[0].indexOf('!') !== -1) {
              return validateError('required', { path: `${path}${fieldName}` });
            }
          }
          for (let i in fieldValue) {
            result = validateFields(fieldValue[i], typeOfField[0], removeNotAllow, `${path}${fieldName}.${i}.`, newData, trimStrings);
            if (result.error) return result;
          }
        } else {
          if (fieldValue == undefined) {
            result = validateFields(fieldValue, typeOfField[0], removeNotAllow, `${path}${fieldName}[0].`, newData, trimStrings);
          } else {
            return validateError('Invalid Type', { path: `${path}${fieldName}`, typeOfField: 'array', realType: typeof fieldValue });
          }
        }
      } else if (typeof typeOfField == 'object') {
        result = validateFields(fieldValue, typeOfField, removeNotAllow, `${path}${fieldName}.`, newData, trimStrings);
      } else {
        result = validateFields(fieldValue, typeOfField, removeNotAllow, `${path}${fieldName}`, newData, trimStrings);
      }
      if (result.error) return result;
    }
  }
  if (root) return { ...result, data: newData };
  return result;
};

export const validate = (data: any, allowFields: any, options?: any) => {
  options = options || { removeNotAllow: false, trimStrings: true };
  if (options.trimStrings === undefined) options.trimStrings = true;
  let result = validateFields(data, allowFields, options.removeNotAllow, '', null, options.trimStrings);
  if (result.error) throw new ValidationException(9996, result.message);
  return result?.data || {};
};

const allowanceSchema = {
  monthly_payslip_id: 'number',
  allowance_type_id: 'number',
  amount: 'number!',
  name_snapshot: 'string',
  created_at: 'date',
  updated_at: 'date'
};

export const validatePayslipAllowancePayload = (payload: any) => {
  try {
    const data = validate(payload, allowanceSchema, { removeNotAllow: true });
    return { valid: true, data };
  } catch (e: any) {
    if (e && e.name === 'ValidationException') return { valid: false, errors: [e.message] };
    return { valid: false, errors: [e.message || String(e)] };
  }
};

const allowanceTypeSchema = {
  name: 'string!',
  description: 'string',
  is_taxable: 'boolean',
  default_amount: 'number'
};

export const validateAllowanceTypePayload = (payload: any) => {
  try {
    const data = validate(payload, allowanceTypeSchema, { removeNotAllow: true });
    return { valid: true, data };
  } catch (e: any) {
    if (e && e.name === 'ValidationException') return { valid: false, errors: [e.message] };
    return { valid: false, errors: [e.message || String(e)] };
  }
};

export default { validate, validateFields, ValidationException, validatePayslipAllowancePayload, validateAllowanceTypePayload };
