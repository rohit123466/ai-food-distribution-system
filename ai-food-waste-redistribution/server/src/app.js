const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// origin: true reflects the request's Origin header — required for the refresh-token
// cookie to be sent cross-origin (e.g. Vite dev server on :5173 -> API on :5000); a
// wildcard '*' origin is rejected by browsers whenever credentials: true is set.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Donation photos (local-disk storage). fallthrough: false turns a missing file
// into a 404 here instead of it reaching the API's notFound handler.
app.use('/uploads', express.static(env.uploadsDir, { fallthrough: false, index: false }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
