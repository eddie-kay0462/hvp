import * as servicesService from '../services/servicesService.js';
import { logger } from '../config/logger.js';

/**
 * Get all services
 * Supports query parameters: category, search, limit, offset, sortBy, order
 */
const getAllServices = async (req) => {
  try {
    const { category, search, limit, offset, sortBy, priceMin, priceMax, minRating } = req.query;

    const filters = {
      category: category || null,
      search: search || null,
      limit: limit ? parseInt(limit) : 12,
      offset: offset ? parseInt(offset) : 0,
      sortBy: sortBy || 'recommended',
      priceMin: priceMin != null && priceMin !== '' ? Number(priceMin) : undefined,
      priceMax: priceMax != null && priceMax !== '' ? Number(priceMax) : undefined,
      minRating: minRating != null && minRating !== '' ? Number(minRating) : undefined,
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
    logger.error('getAllServices error:', error);
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
    logger.error('getServiceById error:', error);
    return { status: 500, msg: 'Failed to retrieve service', data: null };
  }
};

export default {
  getAllServices,
  getServiceById
};