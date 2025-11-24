const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options ={
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Resume Analyzer and Suggestion Service API',
            version: '1.0.0',
            description: 'API documentation for the Resume Analyzer and Suggestion Service',
        },
        servers: [
            {
                url: 'https://sea-lion-app-3wol8.ondigitalocean.app/',
                description: 'Development server',
            },
        ],
    },
    apis: ['./routes/*.js'], // Path to the API docs
}
const swaggerSpec = swaggerJSDoc(options);
module.exports = {swaggerUi, swaggerSpec};