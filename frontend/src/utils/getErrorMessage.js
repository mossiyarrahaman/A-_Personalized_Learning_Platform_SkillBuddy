export const getErrorMessage = (err) =>
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Something went wrong. Please try again.';
