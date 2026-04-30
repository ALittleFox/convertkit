export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidator {
  validate(file: File): ValidationResult;
  filterValid(files: File[]): { valid: File[]; invalid: { file: File; error: string }[] };
}

export function createFileValidator(
  allowedTypes: string[],
  maxSize: number,
  maxLabel: string
): FileValidator {
  function validate(file: File): ValidationResult {
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `不支持的格式: ${file.type || "未知"}` };
    }
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB (最大 ${maxLabel})`,
      };
    }
    return { valid: true };
  }

  function filterValid(files: File[]) {
    const valid: File[] = [];
    const invalid: { file: File; error: string }[] = [];
    for (const file of files) {
      const result = validate(file);
      if (result.valid) {
        valid.push(file);
      } else {
        invalid.push({ file, error: result.error! });
      }
    }
    return { valid, invalid };
  }

  return { validate, filterValid };
}

const imageValidator = createFileValidator(
  ["image/jpeg", "image/png", "image/webp", "image/avif"],
  100 * 1024 * 1024,
  "100MB"
);

export const validateFile = imageValidator.validate;
export const filterValidFiles = imageValidator.filterValid;

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export function getFilenameWithoutExt(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    parts.pop();
  }
  return parts.join(".");
}
