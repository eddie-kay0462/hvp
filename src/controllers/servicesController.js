import * as servicesService from '../services/servicesService.js';

/**
 * Get all services
 * Supports query parameters: category, search, limit, offset, sortBy, order
 */
const getAllServices = async (req) => {
  try {
    const { category, search, limit, offset, sortBy, order } = req.query;
    
    const filters = {
      category: category || null,
      search: search || null,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      sortBy: sortBy || 'created_at',
      order: order || 'desc'
    };

    // Validate limit and offset
    if (filters.limit < 1 || filters.limit > 100) {
      return { status: 400, msg: 'Limit must be between 1 and 100', data: null };
    }
    if (filters.offset < 0) {
      return { status: 400, msg: 'Offset must be 0 or greater', data: null };
    }

    const result = await servicesService.getAllServices(filters);
    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error('getAllServices error:', error);
    return { status: 500, msg: 'Failed to retrieve services', data: null };
  }
};

/**
 * Get service by ID
 */
const getServiceById = async (req) => {
  try {
    const { id } = req.params;
    if (!id) {
      return { status: 400, msg: 'Service ID is required', data: null };
    }

    const result = await servicesService.getServiceById(id);
    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error('getServiceById error:', error);
    return { status: 500, msg: 'Failed to retrieve service', data: null };
  }
};

export default {
  getAllServices,
  getServiceById
};