const SERVICE_UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again shortly.';
const UNEXPECTED_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const FIELD_LABELS = Object.freeze({
  name: 'name', email: 'email address', password: 'password', address: 'address',
  mobile: 'mobile number', price: 'price', stock: 'stock', category: 'category',
  description: 'description', quantity: 'quantity', status: 'status', orderType: 'order type',
  tableNumber: 'table number', guests: 'number of guests', date: 'date', time: 'time',
  last4: 'last four card digits', brand: 'card brand', cardholderName: 'cardholder name',
  expiryMonth: 'expiry month', expiryYear: 'expiry year',
});

function fieldLabel(path) {
  const field = typeof path === 'string' ? path.split('.').at(-1) : '';
  return Object.hasOwn(FIELD_LABELS, field) ? FIELD_LABELS[field] : 'value';
}

function validationMessage(error) {
  const label = fieldLabel(error?.path);
  if (error?.kind === 'required') return `Please provide your ${label}.`;
  if (error?.kind === 'minlength') return `The ${label} is too short.`;
  if (error?.kind === 'maxlength') return `The ${label} is too long.`;
  if (error?.kind === 'min') return `The ${label} is below the allowed minimum.`;
  if (error?.kind === 'max') return `The ${label} exceeds the allowed maximum.`;
  return `Please enter a valid ${label}.`;
}

function publicError(error) {
  if (error?.name === 'ValidationError') {
    const messages = Object.values(error.errors || {}).slice(0, 8).map(validationMessage);
    return { status: 400, message: messages.length ? messages : 'Please check the information you entered.' };
  }
  if (error?.name === 'CastError') {
    return error.path === '_id'
      ? { status: 404, message: 'The requested item could not be found.' }
      : { status: 400, message: `Please enter a valid ${fieldLabel(error.path)}.` };
  }
  if (error?.code === 11000) {
    const emailExists = Object.hasOwn(error.keyPattern || error.keyValue || {}, 'email');
    return { status: 400, message: emailExists
      ? 'An account with this email already exists. Please sign in.'
      : 'A record with these details already exists.' };
  }
  if (error?.type === 'entity.parse.failed') return { status: 400, message: 'The request contains invalid JSON.' };
  if (error?.type === 'entity.too.large' || error?.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'The request is too large. Please send less data.' };
  }
  if (error === 'Error: Images Only!' || error?.name === 'MulterError') {
    return { status: 400, message: 'Please upload a valid image file.' };
  }

  const candidate = error?.statusCode ?? error?.status;
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
  if (status === 503) return { status, message: SERVICE_UNAVAILABLE_MESSAGE };
  if (status >= 500) return { status, message: UNEXPECTED_ERROR_MESSAGE };
  const messages = {
    400: 'Please check the information you entered.',
    401: 'Please sign in to continue.',
    403: 'You do not have permission to do that.',
    404: 'The requested item could not be found.',
    409: 'This request conflicts with an existing record.',
    413: 'The request is too large. Please send less data.',
    429: 'Please wait a moment before trying again.',
  };
  return { status, message: messages[status] || 'This request could not be completed. Please try again.' };
}

function createErrorHandler({ logger = console.error } = {}) {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const { status, message } = publicError(err);
    if (status >= 500) {
      const code = err?.code === 'AUTH_NOT_CONFIGURED' ? 'auth_not_configured'
        : err?.code === 'AUTH_INVALID_CONFIGURATION' ? 'auth_invalid_configuration' : 'unexpected_server_error';
      // Fixed diagnostic categories only: no stack, credentials, request body,
      // database values or raw library messages in logs or public responses.
      try { logger('[CafeSync API]', { code, status }); } catch {}
    }
    return res.status(status).json({ success: false, error: message });
  };
}

const errorHandler = createErrorHandler();
module.exports = { errorHandler, createErrorHandler };
