export function parseFlow(req, res, next) {
  try {
    // Use JSON from query if available; otherwise use the request body
    const flow = req.query.json ? JSON.parse(req.query.json) : req.body;
    res.locals.flow = flow;
    next();
  } catch (error) {
    return res.status(400).send({ msg: 'Invalid JSON' });
  }
}
