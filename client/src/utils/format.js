import { formatDistanceToNow, format, parseISO } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM dd, yyyy');
  } catch {
    return '';
  }
};

export const formatDateTime = (date) => {
  if (!date) return '';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM dd, yyyy HH:mm');
  } catch {
    return '';
  }
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  try {
    return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
      addSuffix: true,
    });
  } catch {
    return '';
  }
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatPercent = (percent) => {
  if (!percent && percent !== 0) return '';
  return `${parseFloat(percent).toFixed(2)}%`;
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const formatEIN = (ein) => {
  if (!ein) return '';
  const cleaned = ein.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  }
  return ein;
};

// Validators
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10;
};

export const validateEIN = (ein) => {
  const cleaned = ein.replace(/\D/g, '');
  return cleaned.length === 9;
};

export const validatePassword = (password) => {
  return password.length >= 8;
};

// Status helpers
export const getStatusColor = (status) => {
  const colors = {
    submitted: 'blue',
    underwriting: 'yellow',
    approved: 'green',
    declined: 'red',
    funded: 'green',
    active: 'green',
    paid_off: 'gray',
    defaulted: 'red',
    pending: 'yellow',
  };
  return colors[status] || 'gray';
};

export const getStatusLabel = (status) => {
  const labels = {
    submitted: 'Submitted',
    underwriting: 'Under Review',
    approved: 'Approved',
    declined: 'Declined',
    funded: 'Funded',
    active: 'Active',
    paid_off: 'Paid Off',
    defaulted: 'Defaulted',
    pending: 'Pending',
  };
  return labels[status] || status;
};
