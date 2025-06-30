// src/app/lib/security/validation.ts
import { ValidationResult } from './api-security';

// Staff validation
export function validateStaffInput(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { email, fullName, role, phone, isActive } = data;

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Valid email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
  }

  // Full name validation
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }

  // Role validation
  const validRoles = ['admin', 'trainer', 'staff'];
  if (!role || !validRoles.includes(role)) {
    errors.push('Valid role is required (admin, trainer, or staff)');
  }

  // Phone validation (optional)
  if (phone && typeof phone === 'string') {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Please enter a valid phone number');
    }
  }

  // isActive validation
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean value');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize data
  const sanitizedData = {
    email: email.toLowerCase().trim(),
    fullName: fullName.trim(),
    role: role.toLowerCase(),
    phone: phone ? phone.trim() : '',
    isActive: isActive !== undefined ? isActive : true,
  };

  return { isValid: true, errors: [], sanitizedData };
}

// Member validation
export function validateMemberInput(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { 
    email, firstName, lastName, phone, dateOfBirth, 
    emergencyContact, martialArtsLevel, parentId 
  } = data;

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Valid email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
  }

  // Name validation
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1) {
    errors.push('First name is required');
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1) {
    errors.push('Last name is required');
  }

  // Phone validation
  if (phone && typeof phone === 'string') {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Please enter a valid phone number');
    }
  }

  // Date of birth validation
  if (dateOfBirth) {
    const date = new Date(dateOfBirth);
    if (isNaN(date.getTime())) {
      errors.push('Please enter a valid date of birth');
    }
  }

  // Emergency contact validation
  if (emergencyContact && typeof emergencyContact === 'object') {
    if (!emergencyContact.name || typeof emergencyContact.name !== 'string') {
      errors.push('Emergency contact name is required');
    }
    if (!emergencyContact.phone || typeof emergencyContact.phone !== 'string') {
      errors.push('Emergency contact phone is required');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize data
  const sanitizedData = {
    email: email.toLowerCase().trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone ? phone.trim() : '',
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    emergencyContact: emergencyContact ? {
      name: emergencyContact.name.trim(),
      phone: emergencyContact.phone.trim(),
      relationship: emergencyContact.relationship?.trim() || ''
    } : null,
    martialArtsLevel: martialArtsLevel || null,
    parentId: parentId || null,
  };

  return { isValid: true, errors: [], sanitizedData };
}

// Membership plan validation
export function validateMembershipInput(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { 
    name, description, price, durationMonths, 
    allowedClassTypes, maxClassesPerWeek, maxClassesPerMonth 
  } = data;

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Membership name must be at least 2 characters');
  }

  // Price validation
  if (typeof price !== 'number' || price < 0) {
    errors.push('Price must be a positive number');
  }

  // Duration validation
  if (typeof durationMonths !== 'number' || durationMonths < 1 || durationMonths > 24) {
    errors.push('Duration must be between 1 and 24 months');
  }

  // Class types validation
  if (!allowedClassTypes || !Array.isArray(allowedClassTypes) || allowedClassTypes.length === 0) {
    errors.push('At least one class type must be selected');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize data
  const sanitizedData = {
    name: name.trim(),
    description: description?.trim() || '',
    price: parseFloat(price.toFixed(2)),
    durationMonths: parseInt(durationMonths),
    allowedClassTypes: allowedClassTypes.map((type: string) => type.trim()),
    maxClassesPerWeek: maxClassesPerWeek || null,
    maxClassesPerMonth: maxClassesPerMonth || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  return { isValid: true, errors: [], sanitizedData };
}

// Class validation
export function validateClassInput(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { 
    name, description, classType, trainerId, 
    maxParticipants, schedule, duration 
  } = data;

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Class name must be at least 2 characters');
  }

  // Class type validation
  const validClassTypes = ['MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Fitness'];
  if (!classType || !validClassTypes.includes(classType)) {
    errors.push('Valid class type is required');
  }

  // Trainer ID validation
  if (!trainerId || typeof trainerId !== 'string') {
    errors.push('Trainer ID is required');
  }

  // Max participants validation
  if (typeof maxParticipants !== 'number' || maxParticipants < 1 || maxParticipants > 50) {
    errors.push('Max participants must be between 1 and 50');
  }

  // Duration validation
  if (typeof duration !== 'number' || duration < 30 || duration > 180) {
    errors.push('Duration must be between 30 and 180 minutes');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize data
  const sanitizedData = {
    name: name.trim(),
    description: description?.trim() || '',
    classType,
    trainerId,
    maxParticipants: parseInt(maxParticipants),
    schedule: schedule || {},
    duration: parseInt(duration),
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  return { isValid: true, errors: [], sanitizedData };
}