import * as invoiceService from '../services/invoiceService.js';

/**
 * GET /api/invoices/:id
 */
const getById = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: 'Unauthorized', data: null };
    }
    const { id } = req.params;
    const result = await invoiceService.getInvoiceById(userId, id);
    return { status: result.status, msg: result.msg, data: result.data };
  } catch (e) {
    console.error('invoice getById error:', e);
    return { status: 500, msg: 'Failed to retrieve invoice', data: null };
  }
};

export default {
  getById
};


