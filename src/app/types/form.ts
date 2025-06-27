// src/app/types/form.ts - Form validation and field types

import { SelectOption } from './ui';

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  email?: boolean;
  number?: boolean;
  min?: number;
  max?: number;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  validation?: ValidationRule;
  placeholder?: string;
  options?: SelectOption[];
  rows?: number; // for textarea
  accept?: string; // for file input
  multiple?: boolean; // for file input
  disabled?: boolean;
  hidden?: boolean;
}

export interface FormSchema {
  fields: FormField[];
  submitText?: string;
  resetOnSubmit?: boolean;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormHookProps {
  initialValues?: Record<string, any>;
  validationSchema?: Record<string, ValidationRule>;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormSubmitResponse {
  success: boolean;
  errors?: FormValidationError[];
  message?: string;
}