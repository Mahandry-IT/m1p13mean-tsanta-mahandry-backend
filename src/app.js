const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const routes = require('./routes/index.routes');
const { corsOptions } = require('./config/cors');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const initSwagger = require('./docs/swagger');

const app = express();

// Security & common middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// API Docs
initSwagger(app);

// API Routes
app.use('/api', routes);

// 404 and Error handling
app.use((req, res, next) => notFoundHandler(req, res, next));
app.use((err, req, res, next) => errorHandler(err, req, res, next));

module.exports = app;
