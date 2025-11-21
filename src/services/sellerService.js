import { supabase } from '../config/supabase.js';

export const setupSeller = async (userId, sellerData) => {
  try {
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    // Insert or update seller data
    const { data, error } = await supabase
      .from('sellers')
      .upsert(
        {
          user_id: userId,
          ...sellerData
        },
        { onConflict: 'user_id' } // Update if row exists
      )
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return { status: 200, msg: "Seller info saved successfully", data };

  } catch (e) {
    return { status: 500, msg: "Failed to save seller info", data: null };
  }
};


export const createService = async (userId, serviceData) => {
  try {
    const { data, error } = await supabase
      .from('services') // make sure your table is called "services"
      .insert([{ user_id: userId, ...serviceData }])
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return { status: 201, msg: "Service created successfully", data };
  } catch (e) {
    console.error("Supabase insert error:", e);
    return { status: 500, msg: "Failed to create service", data: null };
  }
};

export const editService = async (userId, serviceId, updates) => {
  try {
    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    // Check ownership first - verify service exists and belongs to user
    const { data: service, error: fetchError } = await supabase
      .from("services")
      .select("id, user_id")
      .eq("id", serviceId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !service) {
      if (fetchError?.code === 'PGRST116') {
        return { status: 404, msg: "Service not found", data: null };
      }
      return { status: 404, msg: "Service not found or you do not have permission", data: null };
    }

    // Remove undefined and null fields to allow partial updates
    // Also remove is_verified from updates (should be managed by admin/system)
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, v]) => 
        v !== undefined && 
        v !== null && 
        key !== 'is_verified' // Don't allow sellers to update verification status
      )
    );

    // Check if there are any updates to apply
    if (Object.keys(cleanUpdates).length === 0) {
      return { status: 400, msg: "No valid fields to update", data: null };
    }

    // Update the service - using .update() with proper filters
    const { data, error } = await supabase
      .from("services")
      .update(cleanUpdates)
      .eq("id", serviceId)
      .eq("user_id", userId) // Ensure ownership
      .select()
      .single();

    if (error) {
      console.error("Update service error:", error);
      return { status: 400, msg: error.message || "Failed to update service", data: null };
    }

    if (!data) {
      return { status: 404, msg: "Service not found after update", data: null };
    }

    return { status: 200, msg: "Service updated successfully", data };
  } catch (e) {
    console.error("editService error:", e);
    return { status: 500, msg: "Failed to update service", data: null };
  }
};

// Service to toggle service status
export const toggleService = async (userId, serviceId) => {
  try {
    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    // Fetch the service - check ownership using user_id (consistent with other functions)
    const { data: service, error: fetchError } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !service) {
      if (fetchError?.code === 'PGRST116') {
        return { status: 404, msg: "Service not found", data: null };
      }
      return { status: 404, msg: "Service not found or you do not have permission", data: null };
    }

    // Flip the is_active flag
    const newStatus = !service.is_active;

    // Update the service status
    const { data: updatedService, error: updateError } = await supabase
      .from("services")
      .update({ is_active: newStatus })
      .eq("id", serviceId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      return { status: 500, msg: "Failed to update service status", data: null };
    }

    return {
      status: 200,
      msg: `Service is now ${newStatus ? "active" : "inactive"}`,
      data: updatedService
    };
  } catch (e) {
    console.error("Toggle service error:", e);
    return { status: 500, msg: "Failed to toggle service status", data: null };
  }
};
