const asyncHandler = (requestHandler) => {
  //It takes a route handler (which is usually an async function) as input and returns a new function.
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

/* 
  asyncHandler: A utility to wrap async route handlers in Express

  WHY?
  In Express, if an async function throws an error (e.g. DB fails),
  we need to catch it manually using try-catch. Writing try-catch everywhere
  becomes repetitive and messy.

  WHAT THIS DOES:
  - Takes an async function (requestHandler) as input.
  - Returns a new function (with req, res, next) that calls the original function.
  - If the async function fails (throws an error), it's caught using .catch().
  - The error is passed to next(err), which lets Express handle it properly.

  USAGE EXAMPLE:
  const asyncHandler = (fn) => (req, res, next) =>
      Promise.resolve(fn(req, res, next)).catch(next);

  // Without asyncHandler (need try-catch)
  app.get('/route', async (req, res, next) => {
      try {
          const data = await somethingAsync();
          res.send(data);
      } catch (err) {
          next(err);
      }
  });

  // With asyncHandler (cleaner!)
  app.get('/route', asyncHandler(async (req, res, next) => {
      const data = await somethingAsync();
      res.send(data);
  }));

  TL;DR:
  Wrap async routes with asyncHandler to catch errors automatically
  and prevent crashing the server.
*/
