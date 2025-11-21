import { supabase } from '../config/supabase.js';
export const createRequest = async (userId, requestData) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .insert([{ 
          user_id: userId, 
          ...requestData,
          status: 'active',
          created_at: new Date().toISOString() 
        }])
        .select()
        .single();
  
      if (error) {
        console.error("Supabase error:", error);
        return { status: 400, msg: error.message, data: null };
      }
  
      return { status: 201, msg: "Request created successfully", data };
    } catch (error) {
      console.error("createRequest error:", error);
      return { status: 500, msg: "Failed to create request", data: null };
    }
  };

  export const acceptRequest = async (sellerId, requestId) => {
    try {
      // Fetch request
      const { data: request, error: fetchError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();
  
      if (fetchError || !request) return { status: 404, msg: "Request not found", data: null };
      if (request.status !== 'active') return { status: 400, msg: `Cannot accept request with status ${request.status}`, data: null };
  
      // Update status to accepted
      const { data, error: updateError } = await supabase
        .from('requests')
        .update({ status: 'accepted', accepted_by: sellerId, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .select()
        .single();
  
      if (updateError) return { status: 400, msg: updateError.message, data: null };
      return { status: 200, msg: "Request accepted successfully", data };
    } catch (error) {
      console.error(error);
      return { status: 500, msg: "Failed to accept request", data: null };
    }
  };