import * as sellerService from '../services/sellerService.js';

const setupSeller = async (req) => {
  try {
    // req.user should already be set by your auth middleware
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const {
      title,
      description,
      category,
      default_price,
      default_delivery_time,
      express_price,
      express_delivery_time,
      portfolio
    } = req.body;

    // Basic validation
    if (!title || !description || !category || !portfolio) {
      return { status: 400, msg: "Title, description, and category are required", data: null };
    }

    const result = await sellerService.setupSeller(userId, {
      title,
      description,
      category,
      default_price,
      default_delivery_time,
      express_price,
      express_delivery_time,
      portfolio
    });

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };

  } catch (error) {
    return { status: 500, msg: "Seller setup failed", data: null };
  }
};

 const createService = async (req) => {
    try {
      const userId = req.user?.id; // set by auth middleware
      if (!userId) {
        return { status: 401, msg: "Unauthorized: user not found", data: null };
      }
  
      const {
        title,
        description,
        category,
        default_price,
        default_delivery_time,
        express_price,
        express_delivery_time,
        portfolio
      } = req.body;
  
      // Basic validation
      if (!title || !description || !category || !portfolio) {
        return { status: 400, msg: "Title, description, category, and portfolio are required", data: null };
      }
  
      // Call the service layer
      const result = await sellerService.createService(userId, {
        title,
        description,
        category,
        default_price,
        default_delivery_time,
        express_price,
        express_delivery_time,
        portfolio
      });
  
      return {
        status: result.status,
        msg: result.msg,
        data: result.data
      };
  
    } catch (error) {
      console.error("CreateService Error:", error);
      return { status: 500, msg: "Service creation failed", data: null };
    }
  };

const editService = async (req) => {
    try {
      const userId = req.user?.id; // from auth middleware
      if (!userId) {
        return { status: 401, msg: "Unauthorized: user not found", data: null };
      }
  
      const { serviceId } = req.params;
      const {
        title,
        description,
        category,
        default_price,
        default_delivery_time,
        express_price,
        express_delivery_time,
        portfolio,
        is_verified
      } = req.body;
  
      // Basic validation
      if (!title && !description && !category && !default_price && !portfolio) {
        return { status: 400, msg: "At least one field must be provided to update", data: null };
      }
  
      const result = await sellerService.editService(userId, serviceId, {
        title,
        description,
        category,
        default_price,
        default_delivery_time,
        express_price,
        express_delivery_time,
        portfolio,
        is_verified
      });
  
      return {
        status: result.status,
        msg: result.msg,
        data: result.data
      };
  
    } catch (error) {
      console.error("Edit service error:", error);
      return { status: 500, msg: "Service update failed", data: null };
    }
  };
  

const toggleService = async (req) => {
  try {
    const userId = req.user?.id; // from verifyToken middleware
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { serviceId } = req.params;

    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    // Call service layer for DB logic
    const result = await sellerService.toggleService(userId, serviceId);

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };

  } catch (err) {
    console.error("Toggle service error:", err);
    return { status: 500, msg: "Could not toggle service status", data: null };
  }
};

export default {
  setupSeller,
  createService,
  editService,
  toggleService
};
