/**
 * Response handler middleware
 * Wraps async controller functions to handle errors and responses
 */
export const responseHandler = (fn) => {
    return async (req, res, next) => {
      try {
        const result = await fn(req, res, next); // get the returned object
        if (result) {
          return res.status(result.status || 200).json(result); // send it as JSON
        }
        // fallback if controller returns nothing
        return res.status(500).json({ status: 500, msg: "No response from controller", data: null });
      } catch (error) {
        console.error("Unhandled error in responseHandler:", error);
        return res.status(500).json({ status: 500, msg: "Internal Server Error", data: null });
      }
    };
  };
  