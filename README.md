# Parcel Delivery Management System - Server Side

This repository contains the server-side implementation of the **Parcel Delivery Management System**, designed to manage and streamline parcel deliveries. It handles user authentication, delivery requests, notifications, and data management for admins, users, and delivery personnel.

---

## Features

- **Role-Based Authentication**: Admin, user, and delivery personnel login with secure JWT authentication.
- **Delivery Requests**: API endpoints to handle delivery requests and approvals.
- **Notifications**: Delivery request notifications for admins.
- **Reviews Management**: Stores and retrieves reviews specific to each delivery personnel.
- **Database Integration**: CRUD operations for users, parcels, and delivery requests.
- **Secure APIs**: Middleware for secure and restricted routes.

---

## Technologies Used

- **Node.js**: Backend runtime environment.
- **Express.js**: Framework for creating RESTful APIs.
- **MongoDB**: Database for managing data.
- **Cors**: Enables secure cross-origin requests.
- **JWT (jsonwebtoken)**: Authentication and authorization.
- **dotenv**: Manages environment variables.
- **Body-parser**: Parses incoming request bodies.
- **Nodemon**: For development server monitoring.

---

## Installation and Setup

1. Clone this repository:
   ```bash
   git clone <repository link>
   cd parcel-delivery-management-server
   ```
2. Install dependencies:

```bash
npm install
```
3. Create a .env file in the root directory and configure the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```
4.Start the development server:
```bash
nodemon index.js
```

## Folder Structure

```
├── assets
│   └── lib
├── controllers
├── middlewares
├── models
├── routes
├── utils
├── .env
├── index.js
```
controllers: Handles request logic.
middlewares: Contains authentication and validation middleware.
models: Defines MongoDB schemas.
routes: API route handlers.
utils: Helper functions for the server.


## API Endpoints

| Method | Endpoint                          | Description                                   |
|--------|-----------------------------------|-----------------------------------------------|
| POST   | `/api/login`                      | Login for admin, users, or delivery personnel |
| POST   | `/api/register`                   | Register a new user                           |
| GET    | `/api/delivery-requests`          | Fetch all delivery requests (admin only)      |
| POST   | `/api/delivery-requests`          | Create a new delivery request                 |
| PUT    | `/api/delivery-requests/:id/approve` | Approve a delivery request (admin only)      |
| GET    | `/api/reviews/:deliveryId`        | Fetch reviews for a specific delivery person  |


## Contact
For any queries or issues, feel free to reach out:
Nahida Akter Jenifa
Frontend & Full Stack Developer
nahidaakterjenifa@gmail.com | www.linkedin.com/in/nahida-akter-jenifa


   
